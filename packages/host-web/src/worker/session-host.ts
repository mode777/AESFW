/**
 * The worker-side session host (TDS-21.1). Runs the session off the UI thread,
 * owns the only clock, coalesces deltas, persists saves, and stops on an
 * `InvariantViolation`. Everything is injected (port, clock, storage) so it is
 * testable in-process.
 *
 * Source: TDS-21.1
 */
import {
  advance,
  createSession,
  diffProjection,
  instantiateContentEntities,
  load,
  project,
  save,
  submitCommand,
} from '@aesfw/app';
import type { SaveDocument, SessionState } from '@aesfw/app';
import { createMemorySource, defaultWorldPlan, loadContent } from '@aesfw/content';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { InvariantViolation, instantiateWorld } from '@aesfw/core';
import type { DomainEvent, OwnerHandle } from '@aesfw/core';
import { PROTOCOL_VERSION, decodeWorkerRequest } from '@aesfw/protocol';
import type {
  ContentSourceDto,
  EventDto,
  JsonObject,
  JsonValue,
  SnapshotDto,
  WorkerResponseDto,
} from '@aesfw/protocol';

/** The message port the host talks over (TDS-21.1). */
export interface SessionHostPort {
  postMessage(message: WorkerResponseDto): void;
  onMessage(handler: (data: unknown) => void): void;
}

/** Save storage behind the host (TDS-21.1). Methods may be asynchronous so a
 * host can back them with IndexedDB. */
export interface SaveStorage {
  get(slot: string): SaveDocument | null | Promise<SaveDocument | null>;
  put(slot: string, doc: SaveDocument): void | Promise<void>;
}

/** Composition of a session host (TDS-21.1). */
export interface SessionHostOptions {
  readonly port: SessionHostPort;
  readonly storage: SaveStorage;
  readonly tickDurationMs: number;
  readonly actor: OwnerHandle;
  readonly actorId: string;
  readonly seed?: readonly [number, number];
  readonly maxCatchUpTicks?: number;
  readonly setTimer?: (fn: () => void, ms: number) => number;
  readonly clearTimer?: (id: number) => void;
  /** Content to use when the `init` message carries no sources (tests). */
  readonly content?: CompiledContent;
  /** Composition seam invoked after a session is created, before `ready`. */
  readonly prepare?: (session: SessionState) => void;
}

/** A running session host (TDS-21.1). */
export interface SessionHost {
  start(): void;
}

const asJson = (value: unknown): JsonValue => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return value;
  return null;
};

const toArguments = (args: Readonly<Record<string, unknown>>): JsonObject => {
  const out: Record<string, JsonValue> = {};
  for (const key of Object.keys(args).sort()) out[key] = asJson(args[key]);
  return out;
};

const toEventDto = (sessionId: string, event: DomainEvent): EventDto => ({
  session_id: sessionId,
  tick: event.tick,
  sequence: event.seq,
  type: event.type,
  subjects: [...event.subjects],
  payload: (event.payload ?? {}) as JsonObject,
});

/**
 * Creates a session host over the injected port, clock, and storage
 * (TDS-21.1).
 *
 * Source: TDS-21.1
 */
export function createSessionHost(options: SessionHostOptions): SessionHost {
  const maxCatchUpTicks = options.maxCatchUpTicks ?? 8;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = options.clearTimer ?? ((id) => clearTimeout(id));

  let session: SessionState | null = null;
  let content: CompiledContent | null = null;
  let lastPublished: SnapshotDto | null = null;
  let pendingEvents: EventDto[] = [];
  let lastGoodHash = '';
  let speed = 1;
  let running = false;
  let timerId: number | null = null;

  const post = (message: WorkerResponseDto): void => {
    options.port.postMessage(message);
  };

  const publish = (): void => {
    if (session === null) return;
    const snapshot = project(session, options.actor);
    if (lastPublished === null) {
      post({ kind: 'snapshot', protocol_version: PROTOCOL_VERSION, snapshot });
    } else {
      const delta = diffProjection(lastPublished, snapshot);
      post({
        kind: 'delta',
        protocol_version: PROTOCOL_VERSION,
        delta,
        events: pendingEvents,
      });
    }
    lastPublished = snapshot;
    pendingEvents = [];
  };

  const stop = (): void => {
    running = false;
    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }
  };

  const advanceTicks = (ticks: number): void => {
    if (session === null) return;
    try {
      const result = advance(session, ticks);
      session = result.session;
      for (const output of result.outputs) {
        for (const event of output.events) {
          pendingEvents.push(toEventDto(session.sessionId, event));
        }
        if (output.hash !== null) lastGoodHash = output.hash;
      }
      publish();
    } catch (error) {
      if (error instanceof InvariantViolation) {
        stop();
        post({
          kind: 'error',
          protocol_version: PROTOCOL_VERSION,
          code: error.code,
          arguments: toArguments(error.args),
          ...(lastGoodHash === '' ? {} : { last_good_hash: lastGoodHash }),
        });
        return;
      }
      throw error;
    }
  };

  const schedule = (): void => {
    if (!running) return;
    timerId = setTimer(() => {
      if (!running) return;
      advanceTicks(Math.max(1, Math.min(speed, maxCatchUpTicks)));
      schedule();
    }, options.tickDurationMs);
  };

  const buildContent = (sources: readonly ContentSourceDto[]): CompiledContent | null => {
    const result = loadContent(
      sources.map((source) =>
        createMemorySource(
          source.root,
          Object.fromEntries(source.files.map((file) => [file.path, file.text])),
        ),
      ),
    );
    return result.content;
  };

  const handleInit = async (init: {
    save_slot?: string;
    content?: readonly ContentSourceDto[];
  }): Promise<void> => {
    if (init.content !== undefined) {
      const loaded = buildContent(init.content);
      if (loaded === null) {
        post({
          kind: 'error',
          protocol_version: PROTOCOL_VERSION,
          code: 'content_load_failed',
          arguments: {},
        });
        return;
      }
      content = loaded;
    } else if (options.content !== undefined) {
      content = options.content;
    }
    if (content === null) {
      post({
        kind: 'error',
        protocol_version: PROTOCOL_VERSION,
        code: 'content_missing',
        arguments: {},
      });
      return;
    }
    if (init.save_slot !== undefined) {
      const doc = await options.storage.get(init.save_slot);
      if (doc !== null) {
        const loaded = load(content, doc);
        if (loaded.ok) session = loaded.value;
      }
    }
    if (session === null) {
      const created = createSession(content, {
        sessionId: 'session.1',
        seed: [options.seed?.[0] ?? 0, options.seed?.[1] ?? 0],
        tickDurationMs: options.tickDurationMs,
        world: null,
        enabledModules: [],
        hashInterval: 1,
        journal: false,
        actor: options.actor,
        actorId: options.actorId,
      });
      if (!created.ok) {
        post({
          kind: 'error',
          protocol_version: PROTOCOL_VERSION,
          code: 'session_create_failed',
          arguments: {},
        });
        return;
      }
      session = created.value;
      const registry = content.registry as ContentRegistry;
      const plan = defaultWorldPlan(registry);
      instantiateWorld(session.world, plan.plan);
      instantiateContentEntities(session.world, registry);
      options.prepare?.(session);
    }
    post({
      kind: 'ready',
      protocol_version: PROTOCOL_VERSION,
      session_id: session.sessionId,
      tick: session.world.tick,
      revision: session.revision,
      configuration_checksum: content.checksum,
    });
  };

  const handle = async (data: unknown): Promise<void> => {
    const decoded = decodeWorkerRequest(data);
    if (!decoded.ok) {
      post({
        kind: 'error',
        protocol_version: PROTOCOL_VERSION,
        code: decoded.error[0]?.code ?? 'protocol.invalid_field',
        arguments: toArguments(decoded.error[0]?.arguments ?? {}),
      });
      return;
    }
    const request = decoded.value;
    switch (request.kind) {
      case 'init':
        await handleInit(request);
        return;
      case 'subscribe':
        if (session !== null) {
          lastPublished = null;
          publish();
        }
        return;
      case 'command':
        if (session !== null) {
          const result = submitCommand(session, request.command);
          session = result.session;
          post({
            kind: 'command_result',
            protocol_version: PROTOCOL_VERSION,
            result: result.result,
          });
        }
        return;
      case 'control':
        switch (request.action) {
          case 'run':
            running = true;
            schedule();
            break;
          case 'pause':
            stop();
            break;
          case 'step':
            advanceTicks(request.ticks ?? 1);
            break;
          case 'speed':
            break;
        }
        if (request.speed !== undefined) speed = request.speed;
        return;
      case 'query':
        post({ kind: 'query_result', protocol_version: PROTOCOL_VERSION, result: {} });
        return;
      case 'save':
        if (session !== null) {
          await options.storage.put(request.slot, save(session));
          post({ kind: 'saved', protocol_version: PROTOCOL_VERSION, slot: request.slot });
        }
        return;
      case 'load': {
        if (content === null) return;
        const doc = await options.storage.get(request.slot);
        if (doc === null) {
          post({
            kind: 'error',
            protocol_version: PROTOCOL_VERSION,
            code: 'save_not_found',
            arguments: { slot: request.slot },
          });
          return;
        }
        const loaded = load(content, doc);
        if (!loaded.ok) {
          post({
            kind: 'error',
            protocol_version: PROTOCOL_VERSION,
            code: 'load_failed',
            arguments: {},
          });
          return;
        }
        session = loaded.value;
        post({ kind: 'loaded', protocol_version: PROTOCOL_VERSION, slot: request.slot });
        lastPublished = null;
        publish();
        return;
      }
    }
  };

  return {
    start() {
      options.port.onMessage((data) => {
        void handle(data);
      });
    },
  };
}
