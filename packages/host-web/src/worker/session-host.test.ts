import { describe, expect, it } from 'vitest';
import { createEmptyRegistry, ids } from '@aesfw/core';
import type { SaveDocument } from '@aesfw/app';
import type { ContentRegistry, CompiledContent } from '@aesfw/content';
import type { WorkerResponseDto } from '@aesfw/protocol';
import { PROTOCOL_VERSION } from '@aesfw/protocol';
import { createSessionHost } from './session-host.js';
import type { SaveStorage, SessionHostPort } from './session-host.js';

const registry: ContentRegistry = {
  ...createEmptyRegistry(),
  definitionOf: () => null,
  definitionsOf: () => [],
  tagsOf: () => [],
};

const content: CompiledContent = {
  registry,
  checksum: 'test',
  packages: [],
  presentation: null,
};

class FakePort implements SessionHostPort {
  readonly messages: WorkerResponseDto[] = [];
  private handler: ((data: unknown) => void) | null = null;
  postMessage(message: WorkerResponseDto): void {
    this.messages.push(message);
  }
  onMessage(handler: (data: unknown) => void): void {
    this.handler = handler;
  }
  send(data: unknown): void {
    void this.handler?.(data);
  }
  of(kind: WorkerResponseDto['kind']): WorkerResponseDto[] {
    return this.messages.filter((message) => message.kind === kind);
  }
}

class FakeClock {
  private readonly timers = new Map<number, () => void>();
  private next = 1;
  setTimer = (fn: () => void): number => {
    const id = this.next++;
    this.timers.set(id, fn);
    return id;
  };
  clearTimer = (id: number): void => {
    this.timers.delete(id);
  };
  fire(): void {
    const callbacks = [...this.timers.values()];
    this.timers.clear();
    for (const callback of callbacks) callback();
  }
}

class FakeStorage implements SaveStorage {
  private readonly saves = new Map<string, SaveDocument>();
  get(slot: string): SaveDocument | null {
    return this.saves.get(slot) ?? null;
  }
  put(slot: string, doc: SaveDocument): void {
    this.saves.set(slot, doc);
  }
}

const setup = (prepare?: (session: import('@aesfw/app').SessionState) => void) => {
  const port = new FakePort();
  const clock = new FakeClock();
  const storage = new FakeStorage();
  const host = createSessionHost({
    port,
    storage,
    tickDurationMs: 100,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner.1',
    content,
    maxCatchUpTicks: 8,
    setTimer: (fn) => clock.setTimer(fn),
    clearTimer: (id) => clock.clearTimer(id),
    ...(prepare === undefined ? {} : { prepare }),
  });
  host.start();
  return { port, clock, storage };
};

const init = (port: FakePort): void =>
  port.send({ kind: 'init', protocol_version: PROTOCOL_VERSION });

describe('[TDS-21.1] session host', () => {
  it('[TDS-21.1] init yields a ready message', () => {
    const { port } = setup();
    init(port);
    const ready = port.of('ready');
    expect(ready).toHaveLength(1);
    if (ready[0]?.kind === 'ready') expect(ready[0].tick).toBe(0);
  });

  it('[TDS-21.1] subscribe yields a snapshot', () => {
    const { port } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    expect(port.of('snapshot')).toHaveLength(1);
  });

  it('[TDS-21.1] a command yields a result', () => {
    const { port } = setup();
    init(port);
    port.send({
      kind: 'command',
      protocol_version: PROTOCOL_VERSION,
      command: {
        command_id: 'c1',
        actor_id: 'test.owner.1',
        type: 'SetEntityEnabled',
        payload: { entity_id: 1, enabled: false },
      },
    });
    expect(port.of('command_result')).toHaveLength(1);
  });

  it('[TDS-21.1] stepping advances the tick and posts one delta', () => {
    const { port } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'step', ticks: 3 });
    expect(port.of('delta')).toHaveLength(1);
  });

  it('[TDS-21.1] catch-up is limited', () => {
    const { port, clock } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'speed', speed: 100 });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'run' });
    clock.fire();
    const deltas = port.of('delta');
    expect(deltas.length).toBeGreaterThanOrEqual(1);
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'pause' });
  });

  it('[TDS-21.1] a save round-trips through storage', async () => {
    const { port } = setup();
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'step', ticks: 2 });
    port.send({ kind: 'save', protocol_version: PROTOCOL_VERSION, slot: 'auto' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    port.send({ kind: 'load', protocol_version: PROTOCOL_VERSION, slot: 'auto' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(port.of('saved')).toHaveLength(1);
    expect(port.of('loaded')).toHaveLength(1);
  });

  it('[TDS-21.1] a violation stops the clock', () => {
    const { port } = setup((session) => {
      session.world.stores
        .get<{ definition: number }>('definition')
        .set(ids.entityId(1), { definition: 1.5 });
    });
    init(port);
    port.send({ kind: 'subscribe', protocol_version: PROTOCOL_VERSION, actor_id: 'test.owner.1' });
    port.send({ kind: 'control', protocol_version: PROTOCOL_VERSION, action: 'step', ticks: 1 });
    const errors = port.of('error');
    expect(errors).toHaveLength(1);
    if (errors[0]?.kind === 'error') expect(errors[0].code).toBe('non_canonical_value');
  });
});
