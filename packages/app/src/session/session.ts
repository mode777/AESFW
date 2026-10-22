/**
 * The pure application session and command gateway (TDS-18.1–18.3). All
 * functions follow the owned-mutation rule of 05 §5.2: the returned `session`
 * replaces the argument.
 *
 * Source: TDS-16.1, TDS-18.1, TDS-18.2, TDS-18.3, ARCH-7
 */
import { createWorld, compareScheduledCommands, entityExists, ids, ok, step } from '@aesfw/core';
import type {
  Command,
  CommandError,
  CommandOutcome,
  Diagnostic,
  EntityId,
  Result,
  ScheduledCommand,
  TickOutput,
  World,
} from '@aesfw/core';
import { decodeCommandEnvelope } from '@aesfw/protocol';
import type { CommandEnvelopeDto } from '@aesfw/protocol';
import type { CompiledContent } from '@aesfw/content';
import type {
  AdvanceResult,
  AcceptedCommandRecord,
  SessionOptions,
  SessionState,
  SubmitResult,
} from './types.js';

const readRevision = (world: World, entity: EntityId): number => {
  const value = world.stores.get<{ revision?: number }>('revision').get(entity);
  return value?.revision ?? 0;
};

const rejected = (
  session: SessionState,
  commandId: string,
  errors: readonly CommandError[],
): SubmitResult => ({
  session,
  result: {
    command_id: commandId,
    status: 'rejected',
    current_revision: session.revision,
    errors: errors.map((error) => ({ code: error.code, arguments: { ...error.arguments } })),
  },
});

const accepted = (
  session: SessionState,
  commandId: string,
  scheduledTick: number,
): SubmitResult => ({
  session,
  result: { command_id: commandId, status: 'accepted', scheduled_tick: scheduledTick },
});

const entityOf = (payload: Record<string, unknown>): EntityId | null => {
  const value = payload['entity_id'];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? ids.entityId(value)
    : null;
};

const mapCommand = (
  content: CompiledContent,
  type: string,
  payload: Record<string, unknown>,
): Result<Command, CommandError> => {
  const entity = entityOf(payload);
  if (entity === null) {
    return { ok: false, error: { code: 'unknown_entity', arguments: { entity: -1 } } };
  }
  switch (type) {
    case 'SetEntityEnabled': {
      const enabled = payload['enabled'];
      if (typeof enabled !== 'boolean') {
        return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
      }
      return ok({ type: 'SetEntityEnabled', entity, enabled });
    }
    case 'SelectRecipe': {
      const recipeId = payload['recipe_id'];
      if (recipeId === null || recipeId === undefined) {
        return ok({ type: 'SelectRecipe', entity, recipe: null });
      }
      if (typeof recipeId !== 'string') {
        return { ok: false, error: { code: 'invalid_recipe', arguments: { entity, recipe: '' } } };
      }
      const recipe = content.registry.handleOf('recipe', ids.stringId(recipeId));
      if (recipe === null) {
        return {
          ok: false,
          error: { code: 'invalid_recipe', arguments: { entity, recipe: recipeId } },
        };
      }
      return ok({ type: 'SelectRecipe', entity, recipe });
    }
    case 'SetProcessPriority': {
      const priority = payload['priority'];
      if (typeof priority !== 'number' || !Number.isSafeInteger(priority)) {
        return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
      }
      return ok({ type: 'SetProcessPriority', entity, priority });
    }
    case 'SetCapabilityPriority': {
      const capabilityId = payload['capability_id'];
      if (typeof capabilityId !== 'string') {
        return {
          ok: false,
          error: { code: 'unknown_capability', arguments: { entity, capability: '' } },
        };
      }
      const capability = content.registry.handleOf('capability', ids.stringId(capabilityId));
      if (capability === null) {
        return {
          ok: false,
          error: { code: 'unknown_capability', arguments: { entity, capability: capabilityId } },
        };
      }
      const priority = payload['priority'];
      if (typeof priority !== 'number' || !Number.isSafeInteger(priority)) {
        return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
      }
      return ok({ type: 'SetCapabilityPriority', entity, capability, priority });
    }
    default:
      return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
  }
};

const referencedEntities = (command: Command): readonly EntityId[] => [command.entity];

/**
 * Creates a session from compiled content (TDS-18.1).
 *
 * Source: TDS-18.1, TDS-18.2
 */
export function createSession(
  content: CompiledContent,
  options: SessionOptions,
): Result<SessionState, Diagnostic[]> {
  const created = createWorld(content.registry, {
    seed: options.seed,
    tickDurationMs: options.tickDurationMs,
    world: options.world,
    enabledModules: options.enabledModules,
  });
  if (!created.ok) return created;
  return ok({
    sessionId: options.sessionId,
    content,
    world: created.value,
    revision: 0,
    nextSubmissionSeq: 0,
    commandLog: [],
    hashLog: [],
    settings: {
      hashInterval: options.hashInterval,
      journal: options.journal,
      actor: options.actor,
      actorId: options.actorId,
      tickDurationMs: options.tickDurationMs,
    },
  });
}

/**
 * Validates and schedules a command (TDS-16.1 steps 1–5, TDS-18.2).
 *
 * Source: TDS-16.1, TDS-18.2, TDS-18.3
 */
export function submitCommand(session: SessionState, envelope: CommandEnvelopeDto): SubmitResult {
  const decoded = decodeCommandEnvelope(envelope);
  if (!decoded.ok) {
    return rejected(session, String(envelope.command_id ?? ''), [
      { code: 'unknown_command', arguments: { type: String(envelope.type ?? '') } },
    ]);
  }
  const env = decoded.value;

  if (env.actor_id !== session.settings.actorId) {
    return rejected(session, env.command_id, [
      { code: 'not_owner', arguments: { actor: env.actor_id } },
    ]);
  }

  const mapped = mapCommand(session.content, env.type, env.payload);
  if (!mapped.ok) return rejected(session, env.command_id, [mapped.error]);
  const command = mapped.value;

  const referenced = referencedEntities(command);
  for (const entity of referenced) {
    if (!entityExists(session.world, entity)) {
      return rejected(session, env.command_id, [{ code: 'unknown_entity', arguments: { entity } }]);
    }
  }

  if (env.expected_session_revision !== undefined) {
    for (const entity of referenced) {
      const actual = readRevision(session.world, entity);
      if (actual > env.expected_session_revision) {
        return rejected(session, env.command_id, [
          {
            code: 'state_revision_mismatch',
            arguments: { expected: env.expected_session_revision, actual },
          },
        ]);
      }
    }
  }

  const tick = ids.tick(session.world.tick + 1);
  const seq = session.nextSubmissionSeq;
  const scheduled: ScheduledCommand = {
    commandId: env.command_id,
    actor: session.settings.actor,
    tick,
    seq,
    command,
  };
  const record: AcceptedCommandRecord = {
    commandId: env.command_id,
    actor: session.settings.actor,
    tick,
    seq,
    command,
  };
  session.world.commandQueue = [...session.world.commandQueue, scheduled].sort(
    compareScheduledCommands,
  );
  const next: SessionState = {
    ...session,
    revision: session.revision + 1,
    nextSubmissionSeq: seq + 1,
    commandLog: [...session.commandLog, record],
  };
  return accepted(next, env.command_id, tick);
}

/**
 * Advances the session by `ticks` ticks (TDS-18.1, TDS-18.3).
 *
 * Source: TDS-18.1, TDS-18.3, TDS-10.1
 */
export function advance(session: SessionState, ticks: number): AdvanceResult {
  if (ticks <= 0) return { session, outputs: [] };
  const outputs: TickOutput[] = [];
  const hashLog = [...session.hashLog];
  const hashing = session.settings.hashInterval > 0;
  let revision = session.revision;
  for (let index = 0; index < ticks; index += 1) {
    const due = session.world.commandQueue.filter(
      (scheduled) => scheduled.tick <= session.world.tick + 1,
    );
    const output = step(session.world, session.content.registry, {
      commands: due,
      options: { journal: session.settings.journal, hash: hashing },
    });
    revision += 1;
    if (
      hashing &&
      session.world.tick % session.settings.hashInterval === 0 &&
      output.hash !== null
    ) {
      hashLog.push({ tick: session.world.tick, hash: output.hash });
    }
    outputs.push(output);
  }
  return { session: { ...session, revision, hashLog }, outputs };
}

/** Re-exported so tests can assert outcome shapes. */
export type { CommandOutcome };
