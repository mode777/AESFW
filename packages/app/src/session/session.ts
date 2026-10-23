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
  FailureKey,
  FailurePolicies,
  FailurePolicy,
  LogicalTransform,
  Orientation,
  Purpose,
  QuantityRule,
  Result,
  ScheduledCommand,
  StationAction,
  StationSpec,
  TickOutput,
  TransportOrderSpec,
  World,
} from '@aesfw/core';
import { decodeCommandEnvelope } from '@aesfw/protocol';
import type { CommandEnvelopeDto } from '@aesfw/protocol';
import type { CompiledContent } from '@aesfw/content';
import { buildSustainedTimerUpdater } from '@aesfw/content';
import { buildConditionEvaluator } from './placement.js';
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

const FAILURE_KEYS: readonly FailureKey[] = [
  'origin_unavailable',
  'destination_unavailable',
  'path_unavailable',
  'cargo_cannot_unload',
  'exchange_limit_not_met',
  'establishment_target_occupied',
];

const FAILURE_POLICIES: readonly FailurePolicy[] = [
  'skip',
  'wait',
  'retry',
  'return',
  'fail',
  'retain',
];

const defaultFailurePolicies = (): FailurePolicies => ({
  origin_unavailable: 'retry',
  destination_unavailable: 'retry',
  path_unavailable: 'retry',
  cargo_cannot_unload: 'retain',
  exchange_limit_not_met: 'skip',
  establishment_target_occupied: 'return',
});

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const parseRule = (value: unknown): QuantityRule | null => {
  const record = asRecord(value);
  const mode = record?.['mode'];
  if (typeof mode !== 'string') return null;
  const quantity = record?.['quantity'];
  if (mode === 'fixed') {
    return typeof quantity === 'number' && Number.isSafeInteger(quantity) && quantity >= 0
      ? { mode: 'fixed', quantity }
      : null;
  }
  if (mode === 'up_to_capacity' || mode === 'all') return { mode };
  if (
    mode === 'excess_above' ||
    mode === 'deficit_below' ||
    mode === 'maintain_origin_minimum' ||
    mode === 'maintain_destination_target'
  ) {
    return typeof quantity === 'number' && Number.isSafeInteger(quantity) && quantity >= 0
      ? { mode, quantity }
      : null;
  }
  if (mode === 'priority_list') {
    const quantities = record?.['quantities'];
    if (
      Array.isArray(quantities) &&
      quantities.every((entry) => typeof entry === 'number' && Number.isSafeInteger(entry))
    ) {
      return { mode: 'priority_list', quantities: quantities as readonly number[] };
    }
  }
  return null;
};

const parseOrderSpec = (
  content: CompiledContent,
  payload: Record<string, unknown>,
): Result<TransportOrderSpec, CommandError> => {
  const templateId = payload['template'];
  let templateData: Record<string, unknown> | null = null;
  if (typeof templateId === 'string') {
    const handle = content.registry.handleOf('transportOrder', ids.stringId(templateId));
    const data =
      handle === null ? null : content.registry.definitionDataOf?.('transportOrder', handle);
    templateData = asRecord(data);
    if (handle === null || templateData === null) {
      return {
        ok: false,
        error: {
          code: 'unknown_definition',
          arguments: { type: 'transportOrder', definition: templateId },
        },
      };
    }
  }
  const templatePolicies = asRecord(templateData?.['failure_policies']);
  const payloadPolicies = asRecord(payload['failure_policies']);
  const failurePolicies: Record<FailureKey, FailurePolicy> = { ...defaultFailurePolicies() };
  for (const key of FAILURE_KEYS) {
    const candidate = payloadPolicies?.[key] ?? templatePolicies?.[key];
    if (
      typeof candidate === 'string' &&
      (FAILURE_POLICIES as readonly string[]).includes(candidate)
    ) {
      failurePolicies[key] = candidate as FailurePolicy;
    }
  }
  const templateScheduling = asRecord(templateData?.['scheduling']);
  const payloadScheduling = asRecord(payload['scheduling']);
  const repeat =
    typeof payload['repeat'] === 'boolean'
      ? payload['repeat']
      : typeof payloadScheduling?.['repeat'] === 'boolean'
        ? payloadScheduling['repeat']
        : typeof templateScheduling?.['repeat'] === 'boolean'
          ? templateScheduling['repeat']
          : true;
  const retry =
    typeof payload['retry_interval_ticks'] === 'number'
      ? payload['retry_interval_ticks']
      : typeof payloadScheduling?.['retry_interval_ticks'] === 'number'
        ? payloadScheduling['retry_interval_ticks']
        : typeof templateScheduling?.['retry_interval_ticks'] === 'number'
          ? templateScheduling['retry_interval_ticks']
          : 20;
  const mode = payload['mode'] ?? templateData?.['mode'] ?? 'route';
  if (mode !== 'route' && mode !== 'explore' && mode !== 'establish' && mode !== 'trade') {
    return { ok: false, error: { code: 'unknown_command', arguments: { type: 'TransportOrder' } } };
  }
  const stationsValue = payload['stations'];
  if (!Array.isArray(stationsValue) || stationsValue.length === 0) {
    return { ok: false, error: { code: 'unknown_command', arguments: { type: 'TransportOrder' } } };
  }
  const stations: StationSpec[] = [];
  for (const rawStation of stationsValue) {
    const station = asRecord(rawStation);
    const endpoint = station?.['endpoint'];
    if (typeof endpoint !== 'number' || !Number.isSafeInteger(endpoint) || endpoint < 0) {
      return { ok: false, error: { code: 'unknown_location', arguments: { location: -1 } } };
    }
    const rawActions = station?.['actions'];
    if (!Array.isArray(rawActions)) {
      return {
        ok: false,
        error: { code: 'unknown_command', arguments: { type: 'TransportOrder' } },
      };
    }
    const actions: StationAction[] = [];
    for (const rawAction of rawActions) {
      const action = asRecord(rawAction);
      const resourceId = action?.['resource'];
      const actionType = action?.['action'];
      const rule = parseRule(action?.['rule']);
      if (typeof resourceId !== 'string' || rule === null) {
        return {
          ok: false,
          error: { code: 'unknown_command', arguments: { type: 'TransportOrder' } },
        };
      }
      if (
        actionType !== 'load' &&
        actionType !== 'unload' &&
        actionType !== 'buy' &&
        actionType !== 'sell'
      ) {
        return {
          ok: false,
          error: { code: 'unknown_command', arguments: { type: 'TransportOrder' } },
        };
      }
      const resource = content.registry.handleOf('resource', ids.stringId(resourceId));
      if (resource === null) {
        return {
          ok: false,
          error: {
            code: 'unknown_definition',
            arguments: { type: 'resource', definition: resourceId },
          },
        };
      }
      const priceLimit = action?.['price_limit'];
      actions.push({
        resource,
        action: actionType,
        rule,
        ...(typeof priceLimit === 'number' && Number.isSafeInteger(priceLimit)
          ? { priceLimit }
          : {}),
      });
    }
    stations.push({ endpoint: ids.entityId(endpoint), actions });
  }
  return {
    ok: true,
    value: {
      mode,
      stations,
      pathPolicy: 'shortest_stable',
      repeat,
      retryIntervalTicks: retry,
      failurePolicies,
    },
  };
};

const mapCommand = (
  content: CompiledContent,
  type: string,
  payload: Record<string, unknown>,
): Result<Command, CommandError> => {
  if (type === 'PlaceEntityPlan') {
    const definitionId = payload['definition_id'];
    const locationId = payload['location_id'];
    const rawTransform = payload['logical_transform'];
    const transform =
      typeof rawTransform === 'object' && rawTransform !== null && !Array.isArray(rawTransform)
        ? (rawTransform as Record<string, unknown>)
        : null;
    const position = transform?.['position'];
    if (
      typeof definitionId !== 'string' ||
      typeof locationId !== 'number' ||
      !Number.isSafeInteger(locationId) ||
      locationId < 0 ||
      !Array.isArray(position) ||
      typeof position[0] !== 'number' ||
      typeof position[1] !== 'number'
    ) {
      return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
    }
    const definition = content.registry.handleOf('entity', ids.stringId(definitionId));
    if (definition === null) {
      return {
        ok: false,
        error: {
          code: 'unknown_definition',
          arguments: { type: 'entity', definition: definitionId },
        },
      };
    }
    const location = ids.entityId(locationId);
    const orientation =
      typeof transform?.['orientation'] === 'number' ? transform['orientation'] : 0;
    const logicalTransform: LogicalTransform = {
      location,
      position: { x: position[0], y: position[1] },
      orientation: orientation as Orientation,
    };
    return ok({ type: 'PlaceEntityPlan', definition, location, transform: logicalTransform });
  }
  if (type === 'CreateTransportOrder') {
    const spec = parseOrderSpec(content, payload);
    return spec.ok ? ok({ type: 'CreateTransportOrder', spec: spec.value }) : spec;
  }
  if (type === 'ModifyTransportOrder') {
    const order = entityOf({ entity_id: payload['order_id'] });
    if (order === null)
      return { ok: false, error: { code: 'unknown_entity', arguments: { entity: -1 } } };
    const spec = parseOrderSpec(content, payload);
    return spec.ok ? ok({ type: 'ModifyTransportOrder', order, spec: spec.value }) : spec;
  }
  if (type === 'DeleteTransportOrder') {
    const order = entityOf({ entity_id: payload['order_id'] });
    if (order === null)
      return { ok: false, error: { code: 'unknown_entity', arguments: { entity: -1 } } };
    return ok({ type: 'DeleteTransportOrder', order });
  }
  if (type === 'AssignTransport') {
    const unit = entityOf({ entity_id: payload['unit_id'] });
    const order = entityOf({ entity_id: payload['order_id'] });
    if (unit === null || order === null) {
      return { ok: false, error: { code: 'unknown_entity', arguments: { entity: -1 } } };
    }
    return ok({ type: 'AssignTransport', unit, order });
  }
  if (type === 'UnassignTransport') {
    const unit = entityOf({ entity_id: payload['unit_id'] });
    if (unit === null)
      return { ok: false, error: { code: 'unknown_entity', arguments: { entity: -1 } } };
    return ok({ type: 'UnassignTransport', unit });
  }
  if (type === 'ActivateLocation' || type === 'DeactivateLocation') {
    const location = payload['location_id'];
    if (typeof location !== 'number' || !Number.isSafeInteger(location) || location < 0) {
      return { ok: false, error: { code: 'unknown_location', arguments: { location: -1 } } };
    }
    return ok({ type, location: ids.entityId(location) });
  }
  if (type === 'ResumeDeficitPausedEntities') {
    const raw = payload['entities'];
    if (raw === 'all') {
      return ok({ type: 'ResumeDeficitPausedEntities', entities: 'all' });
    }
    if (
      Array.isArray(raw) &&
      raw.every((value) => typeof value === 'number' && Number.isSafeInteger(value))
    ) {
      return ok({
        type: 'ResumeDeficitPausedEntities',
        entities: (raw as readonly number[]).map((value) => ids.entityId(value)),
      });
    }
    return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
  }
  if (type === 'SetResourcePurposeLock') {
    const inventory = entityOf({ entity_id: payload['inventory_id'] });
    const resource = payload['resource'];
    const purpose = payload['purpose'];
    const locked = payload['locked'];
    if (inventory === null || typeof resource !== 'string' || typeof purpose !== 'string') {
      return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
    }
    if (typeof locked !== 'boolean') {
      return { ok: false, error: { code: 'unknown_command', arguments: { type } } };
    }
    const handle = content.registry.handleOf('resource', ids.stringId(resource));
    if (handle === null) {
      return { ok: false, error: { code: 'unknown_resource', arguments: { resource } } };
    }
    return ok({
      type: 'SetResourcePurposeLock',
      inventory,
      resource: handle,
      purpose: purpose as Purpose,
      locked,
    });
  }
  const entity = entityOf(payload);
  if (entity === null) {
    return { ok: false, error: { code: 'unknown_entity', arguments: { entity: -1 } } };
  }
  switch (type) {
    case 'CancelEntityPlan':
      return ok({ type: 'CancelEntityPlan', entity });
    case 'CommitConstruction':
      return ok({ type: 'CommitConstruction', entity });
    case 'DeconstructEntity':
      return ok({ type: 'DeconstructEntity', entity });
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

const referencedEntities = (command: Command): readonly EntityId[] => {
  if (command.type === 'PlaceEntityPlan') return [command.location];
  if (command.type === 'ActivateLocation' || command.type === 'DeactivateLocation') {
    return [command.location];
  }
  if (command.type === 'CreateTransportOrder') {
    return command.spec.stations.map((station) => station.endpoint);
  }
  if (command.type === 'ModifyTransportOrder') {
    return [command.order, ...command.spec.stations.map((station) => station.endpoint)];
  }
  if (command.type === 'DeleteTransportOrder') return [command.order];
  if (command.type === 'AssignTransport') return [command.unit, command.order];
  if (command.type === 'UnassignTransport') return [command.unit];
  if (command.type === 'ResumeDeficitPausedEntities') {
    return command.entities === 'all' ? [] : command.entities;
  }
  if (command.type === 'SetResourcePurposeLock') return [command.inventory];
  return [command.entity];
};

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
  const conditionEvaluator = buildConditionEvaluator(session.content);
  const sustainedTimerUpdater = buildSustainedTimerUpdater(session.content);
  let revision = session.revision;
  for (let index = 0; index < ticks; index += 1) {
    const due = session.world.commandQueue.filter(
      (scheduled) => scheduled.tick <= session.world.tick + 1,
    );
    const output = step(session.world, session.content.registry, {
      commands: due,
      options: { journal: session.settings.journal, hash: hashing },
      conditionEvaluator,
      sustainedTimerUpdater,
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
