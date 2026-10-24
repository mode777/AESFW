/**
 * World encode/decode/clone/hash (TDS-8.5). The canonical state uses string
 * definition IDs, ascending entity order, and sorted keys; derived caches are
 * excluded and left dirty by decode and clone. The hash is
 * `fnv1a64(canonicalStringify(encodeWorld(...)))` (algorithm
 * `fnv1a64-canonical-json-v1`).
 *
 * Source: TDS-8.4, TDS-8.5, TDS-19.3, TDS-19.4
 */
import { canonicalStringify, fnv1a64 } from '../det/index.js';
import type { JsonValue, RngStream, Seed } from '../det/index.js';
import type { Diagnostic } from '../errors/diagnostic.js';
import { InvariantViolation } from '../errors/invariant-violation.js';
import { entityId, ownerHandle, reservationId, stringId, tick } from '../ids/index.js';
import type { Brand, DefinitionHandle, StringId } from '../ids/index.js';
import type { Command } from '../commands/types.js';
import type { DefinitionType, Registry } from '../registry/types.js';
import { err, ok } from '../result.js';
import type { Result } from '../result.js';
import { createComponentStores } from './component-store.js';
import type { ComponentStores } from './component-store.js';
import { WORLD_FORMAT_VERSION } from './types.js';
import type {
  AccumulatorEntry,
  AccountEntry,
  ExchangePrice,
  KnowledgeEntry,
  MetricWindow,
  ModuleState,
  NamedRngStream,
  VolumeEntry,
  OwnerState,
  Purpose,
  PurposeLock,
  Reservation,
  RngStreams,
  ScheduledCommand,
  SustainedTimer,
  World,
} from './types.js';

/** A canonical, JSON-safe projection of authoritative world state (TDS-8.5). */
export type CanonicalState = { readonly [key: string]: JsonValue };

/** A state hash: 16 lowercase hex characters (TDS-19.4). */
export type StateHash = Brand<string, 'StateHash'>;

/** Thrown internally by `decodeWorld` and converted to a `Diagnostic`. */
class DecodeFailure extends Error {
  readonly diagnostic: Diagnostic;

  constructor(diagnostic: Diagnostic) {
    super(`invalid canonical state at ${diagnostic.path ?? '$'}`);
    this.name = 'DecodeFailure';
    this.diagnostic = diagnostic;
  }
}

const failDecode = (path: string, code = 'invalid_canonical_state'): never => {
  throw new DecodeFailure({
    code,
    severity: 'error',
    package: null,
    file: null,
    path,
    definition: null,
    args: {},
  });
};

const asRecord = (
  value: JsonValue | undefined,
  path: string,
): { readonly [key: string]: JsonValue } => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return failDecode(path);
  }
  return value as { readonly [key: string]: JsonValue };
};

const asArray = (value: JsonValue | undefined, path: string): readonly JsonValue[] => {
  if (!Array.isArray(value)) return failDecode(path);
  return value as readonly JsonValue[];
};

const asInt = (value: JsonValue | undefined, path: string): number => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return failDecode(path);
  return value;
};

const asString = (value: JsonValue | undefined, path: string): string => {
  if (typeof value !== 'string') return failDecode(path);
  return value;
};

const asBool = (value: JsonValue | undefined, path: string): boolean => {
  if (typeof value !== 'boolean') return failDecode(path);
  return value;
};

const resourceIdOf = (registry: Registry, handle: DefinitionHandle): StringId => {
  const id = registry.stringIdOf('resource', handle);
  if (id === null) {
    throw new InvariantViolation('unknown_definition_handle', { type: 'resource', handle });
  }
  return id;
};

const conditionIdOf = (registry: Registry, handle: DefinitionHandle): StringId => {
  const id = registry.stringIdOf('condition', handle);
  if (id === null) {
    throw new InvariantViolation('unknown_definition_handle', { type: 'condition', handle });
  }
  return id;
};

const handleOf = (
  registry: Registry,
  type: DefinitionType,
  value: JsonValue | undefined,
  path: string,
): DefinitionHandle => {
  const id = asString(value, path);
  const handle = registry.handleOf(type, stringId(id));
  if (handle === null) return failDecode(path, 'unknown_definition');
  return handle;
};

const encodeRng = (rng: RngStreams): JsonValue => ({
  seed: [rng.seed[0], rng.seed[1]],
  streams: rng.streams.map((stream) => ({
    name: stream.name,
    state: [stream.stream.s[0], stream.stream.s[1], stream.stream.s[2], stream.stream.s[3]],
  })),
});

const encodeOwner = (owner: OwnerState, registry: Registry): JsonValue => ({
  handle: owner.handle,
  knowledge: owner.knowledge.map((entry) => ({ location: entry.location, level: entry.level })),
  accounts: owner.accounts.map((entry) => ({
    resource: resourceIdOf(registry, entry.resource),
    amount: entry.amount,
  })),
  purpose_locks: owner.purposeLocks.map((lock) => ({
    inventory: lock.inventory,
    resource: resourceIdOf(registry, lock.resource),
    purpose: lock.purpose,
  })),
  unlocks: [...owner.unlocks],
  deficit_paused: [...owner.deficitPaused],
});

const encodeStores = (stores: ComponentStores): JsonValue => {
  const encoded: { [key: string]: JsonValue } = {};
  for (const kind of stores.kinds) {
    const store = stores.get<JsonValue>(kind);
    const entries: JsonValue[] = [];
    for (const id of store.ids()) {
      entries.push([id, store.get(id) ?? null]);
    }
    encoded[kind] = entries;
  }
  return encoded;
};

/**
 * Encodes the authoritative world state as canonical JSON data (TDS-8.5).
 *
 * Source: TDS-8.4, TDS-8.5, TDS-19.3
 */
export function encodeWorld(world: World, registry: Registry): CanonicalState {
  return {
    format_version: world.formatVersion,
    tick: world.tick,
    next_entity_id: world.nextEntityId,
    next_reservation_id: world.nextReservationId,
    rng: encodeRng(world.rng),
    owners: world.owners.owners.map((owner) => encodeOwner(owner, registry)),
    stores: encodeStores(world.stores),
    ledger: world.ledger.reservations.map((reservation) => ({
      id: reservation.id,
      inventory: reservation.inventory,
      resource: resourceIdOf(registry, reservation.resource),
      quantity: reservation.quantity,
      purpose: reservation.purpose,
      holder: reservation.holder,
      expiry_tick: reservation.expiryTick,
      capacity: reservation.capacity,
    })),
    accumulators: world.accumulators.entries.map((entry) => ({
      subject: entry.subject,
      purpose: entry.purpose,
      resource: resourceIdOf(registry, entry.resource),
      carry: entry.carry,
    })),
    timers: world.timers.timers.map((timer) => ({
      condition: conditionIdOf(registry, timer.condition),
      slot: timer.slot,
      subject: timer.subject,
      consecutive_true_ticks: timer.consecutiveTrueTicks,
    })),
    exchanges: world.exchanges.prices.map((price) => ({
      exchange: price.exchange,
      resource: resourceIdOf(registry, price.resource),
      buy: price.buy,
      sell: price.sell,
      sold_volume: price.soldVolume.map((entry) => ({
        tick: entry.tick,
        quantity: entry.quantity,
      })),
      bought_volume: price.boughtVolume.map((entry) => ({
        tick: entry.tick,
        quantity: entry.quantity,
      })),
    })),
    command_queue: world.commandQueue.map((command) => ({
      command_id: command.commandId,
      actor: command.actor,
      tick: command.tick,
      seq: command.seq,
      command: command.command,
    })),
    modules: {
      enabled: [...world.modules.enabled],
      data: world.modules.data.map((entry) => ({ module: entry.module, value: entry.value })),
    },
    metrics: {
      windows: world.metrics.windows.map((window) => ({
        subject: window.subject,
        purpose: window.purpose,
        resource: resourceIdOf(registry, window.resource),
        window: [...window.window],
      })),
    },
  };
}

const decodeRng = (value: JsonValue | undefined): RngStreams => {
  const record = asRecord(value, '$.rng');
  const seed = asArray(record['seed'], '$.rng.seed');
  if (seed.length !== 2) return failDecode('$.rng.seed');
  const streams: NamedRngStream[] = asArray(record['streams'], '$.rng.streams').map(
    (entry, index) => {
      const streamRecord = asRecord(entry, `$.rng.streams[${index}]`);
      const state = asArray(streamRecord['state'], `$.rng.streams[${index}].state`);
      if (state.length !== 4) return failDecode(`$.rng.streams[${index}].state`);
      const stream: RngStream = {
        s: [
          asInt(state[0], `$.rng.streams[${index}].state[0]`),
          asInt(state[1], `$.rng.streams[${index}].state[1]`),
          asInt(state[2], `$.rng.streams[${index}].state[2]`),
          asInt(state[3], `$.rng.streams[${index}].state[3]`),
        ],
      };
      return { name: asString(streamRecord['name'], `$.rng.streams[${index}].name`), stream };
    },
  );
  return {
    seed: [asInt(seed[0], '$.rng.seed[0]'), asInt(seed[1], '$.rng.seed[1]')] as Seed,
    streams,
  };
};

const decodeOwners = (registry: Registry, value: JsonValue | undefined): OwnerState[] =>
  asArray(value, '$.owners').map((entry, index) => {
    const record = asRecord(entry, `$.owners[${index}]`);
    const knowledge: KnowledgeEntry[] = asArray(
      record['knowledge'],
      `$.owners[${index}].knowledge`,
    ).map((item, itemIndex) => {
      const itemRecord = asRecord(item, `$.owners[${index}].knowledge[${itemIndex}]`);
      return {
        location: entityId(asInt(itemRecord['location'], '$.owners.knowledge.location')),
        level: asString(itemRecord['level'], '$.owners.knowledge.level') as KnowledgeEntry['level'],
      };
    });
    const accounts: AccountEntry[] = asArray(record['accounts'], `$.owners[${index}].accounts`).map(
      (item, itemIndex) => {
        const itemRecord = asRecord(item, `$.owners[${index}].accounts[${itemIndex}]`);
        return {
          resource: handleOf(
            registry,
            'resource',
            itemRecord['resource'],
            '$.owners.accounts.resource',
          ),
          amount: asInt(itemRecord['amount'], '$.owners.accounts.amount'),
        };
      },
    );
    const purposeLocks: PurposeLock[] = asArray(
      record['purpose_locks'],
      `$.owners[${index}].purpose_locks`,
    ).map((item, itemIndex) => {
      const itemRecord = asRecord(item, `$.owners[${index}].purpose_locks[${itemIndex}]`);
      return {
        inventory: entityId(asInt(itemRecord['inventory'], '$.owners.purpose_locks.inventory')),
        resource: handleOf(
          registry,
          'resource',
          itemRecord['resource'],
          '$.owners.purpose_locks.resource',
        ),
        purpose: asString(itemRecord['purpose'], '$.owners.purpose_locks.purpose') as Purpose,
      };
    });
    return {
      handle: ownerHandle(asInt(record['handle'], `$.owners[${index}].handle`)),
      knowledge,
      accounts,
      purposeLocks,
      unlocks: asArray(record['unlocks'], `$.owners[${index}].unlocks`).map((item, itemIndex) =>
        stringId(asString(item, `$.owners[${index}].unlocks[${itemIndex}]`)),
      ),
      deficitPaused: asArray(record['deficit_paused'], `$.owners[${index}].deficit_paused`).map(
        (item, itemIndex) =>
          entityId(asInt(item, `$.owners[${index}].deficit_paused[${itemIndex}]`)),
      ),
    };
  });

const decodeStores = (value: JsonValue | undefined): ComponentStores => {
  const record = asRecord(value, '$.stores');
  const stores = createComponentStores();
  for (const kind of stores.kinds) {
    const store = stores.get<JsonValue>(kind);
    const entries = asArray(record[kind], `$.stores.${kind}`);
    entries.forEach((entry, index) => {
      const pair = asArray(entry, `$.stores.${kind}[${index}]`);
      if (pair.length !== 2) return failDecode(`$.stores.${kind}[${index}]`);
      store.set(entityId(asInt(pair[0], `$.stores.${kind}[${index}][0]`)), pair[1] ?? null);
    });
  }
  return stores;
};

const decodeReservations = (registry: Registry, value: JsonValue | undefined): Reservation[] =>
  asArray(value, '$.ledger').map((entry, index) => {
    const record = asRecord(entry, `$.ledger[${index}]`);
    const expiry = record['expiry_tick'];
    return {
      id: reservationId(asInt(record['id'], '$.ledger.id')),
      inventory: entityId(asInt(record['inventory'], '$.ledger.inventory')),
      resource: handleOf(registry, 'resource', record['resource'], '$.ledger.resource'),
      quantity: asInt(record['quantity'], '$.ledger.quantity'),
      purpose: asString(record['purpose'], '$.ledger.purpose') as Purpose,
      holder: entityId(asInt(record['holder'], '$.ledger.holder')),
      expiryTick: expiry === null ? null : tick(asInt(expiry, '$.ledger.expiry_tick')),
      capacity: asBool(record['capacity'], '$.ledger.capacity'),
    };
  });

const decodeAccumulators = (registry: Registry, value: JsonValue | undefined): AccumulatorEntry[] =>
  asArray(value, '$.accumulators').map((entry, index) => {
    const record = asRecord(entry, `$.accumulators[${index}]`);
    return {
      subject: entityId(asInt(record['subject'], '$.accumulators.subject')),
      purpose: asString(record['purpose'], '$.accumulators.purpose') as Purpose,
      resource: handleOf(registry, 'resource', record['resource'], '$.accumulators.resource'),
      carry: asInt(record['carry'], '$.accumulators.carry'),
    };
  });

const decodeTimers = (registry: Registry, value: JsonValue | undefined): SustainedTimer[] =>
  asArray(value, '$.timers').map((entry, index) => {
    const record = asRecord(entry, `$.timers[${index}]`);
    return {
      condition: handleOf(registry, 'condition', record['condition'], '$.timers.condition'),
      slot: asInt(record['slot'], '$.timers.slot'),
      subject: entityId(asInt(record['subject'], '$.timers.subject')),
      consecutiveTrueTicks: asInt(
        record['consecutive_true_ticks'],
        '$.timers.consecutive_true_ticks',
      ),
    };
  });

const decodeExchanges = (registry: Registry, value: JsonValue | undefined): ExchangePrice[] =>
  asArray(value, '$.exchanges').map((entry, index) => {
    const record = asRecord(entry, `$.exchanges[${index}]`);
    const volume = (field: string): VolumeEntry[] =>
      asArray(record[field], `$.exchanges.${field}`).map((item, entryIndex) => {
        const volumeRecord = asRecord(item, `$.exchanges.${field}[${entryIndex}]`);
        return {
          tick: tick(asInt(volumeRecord['tick'], `$.exchanges.${field}.tick`)),
          quantity: asInt(volumeRecord['quantity'], `$.exchanges.${field}.quantity`),
        };
      });
    return {
      exchange: entityId(asInt(record['exchange'], '$.exchanges.exchange')),
      resource: handleOf(registry, 'resource', record['resource'], '$.exchanges.resource'),
      buy: asInt(record['buy'], '$.exchanges.buy'),
      sell: asInt(record['sell'], '$.exchanges.sell'),
      soldVolume: volume('sold_volume'),
      boughtVolume: volume('bought_volume'),
    };
  });

const decodeCommands = (value: JsonValue | undefined): ScheduledCommand[] =>
  asArray(value, '$.command_queue').map((entry, index) => {
    const record = asRecord(entry, `$.command_queue[${index}]`);
    return {
      commandId: asString(record['command_id'], '$.command_queue.command_id'),
      actor: ownerHandle(asInt(record['actor'], '$.command_queue.actor')),
      tick: tick(asInt(record['tick'], '$.command_queue.tick')),
      seq: asInt(record['seq'], '$.command_queue.seq'),
      // Command payload validation is owned by `add-save-load` (2.5).
      command: record['command'] as unknown as Command,
    };
  });

const decodeModules = (value: JsonValue | undefined): ModuleState => {
  const record = asRecord(value, '$.modules');
  return {
    enabled: asArray(record['enabled'], '$.modules.enabled').map((item, index) =>
      stringId(asString(item, `$.modules.enabled[${index}]`)),
    ),
    data: asArray(record['data'], '$.modules.data').map((item, index) => {
      const itemRecord = asRecord(item, `$.modules.data[${index}]`);
      return {
        module: stringId(asString(itemRecord['module'], '$.modules.data.module')),
        value: itemRecord['value'] ?? null,
      };
    }),
  };
};

const decodeMetrics = (registry: Registry, value: JsonValue | undefined): MetricWindow[] => {
  const record = asRecord(value, '$.metrics');
  return asArray(record['windows'], '$.metrics.windows').map((entry, index) => {
    const windowRecord = asRecord(entry, `$.metrics.windows[${index}]`);
    return {
      subject: entityId(asInt(windowRecord['subject'], '$.metrics.windows.subject')),
      purpose: asString(windowRecord['purpose'], '$.metrics.windows.purpose') as Purpose,
      resource: handleOf(
        registry,
        'resource',
        windowRecord['resource'],
        '$.metrics.windows.resource',
      ),
      window: asArray(windowRecord['window'], '$.metrics.windows.window').map((item) =>
        asInt(item, '$.metrics.windows.window[]'),
      ),
    };
  });
};

const decode = (registry: Registry, state: CanonicalState): World => {
  const root = asRecord(state, '$');
  const formatVersion = asInt(root['format_version'], '$.format_version');
  if (formatVersion !== WORLD_FORMAT_VERSION) {
    return failDecode('$.format_version', 'unsupported_format_version');
  }
  return {
    formatVersion: WORLD_FORMAT_VERSION,
    tick: tick(asInt(root['tick'], '$.tick')),
    nextEntityId: entityId(asInt(root['next_entity_id'], '$.next_entity_id')),
    nextReservationId: reservationId(asInt(root['next_reservation_id'], '$.next_reservation_id')),
    rng: decodeRng(root['rng']),
    owners: { owners: decodeOwners(registry, root['owners']) },
    stores: decodeStores(root['stores']),
    ledger: { reservations: decodeReservations(registry, root['ledger']) },
    accumulators: { entries: decodeAccumulators(registry, root['accumulators']) },
    timers: { timers: decodeTimers(registry, root['timers']) },
    exchanges: { prices: decodeExchanges(registry, root['exchanges']) },
    commandQueue: decodeCommands(root['command_queue']),
    modules: decodeModules(root['modules']),
    metrics: { windows: decodeMetrics(registry, root['metrics']) },
    caches: {
      spatial: undefined,
      connectivity: undefined,
      tags: undefined,
      routes: undefined,
      dirty: true,
    },
  };
};

/**
 * Decodes canonical state into a world, returning diagnostics rather than
 * throwing for malformed input (TDS-8.5).
 *
 * Source: TDS-8.5
 */
export function decodeWorld(
  registry: Registry,
  state: CanonicalState,
): Result<World, Diagnostic[]> {
  try {
    return ok(decode(registry, state));
  } catch (error) {
    if (error instanceof DecodeFailure) return err([error.diagnostic]);
    throw error;
  }
}

const cloneJson = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value !== null && typeof value === 'object') {
    const record = value as { readonly [key: string]: JsonValue };
    const copy: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(record)) {
      copy[key] = cloneJson(record[key] ?? null);
    }
    return copy;
  }
  return value;
};

/**
 * Deep-copies a world, leaving caches dirty (TDS-8.5).
 *
 * Source: TDS-8.5
 */
export function cloneWorld(world: World): World {
  const stores = createComponentStores();
  for (const kind of world.stores.kinds) {
    const source = world.stores.get<JsonValue>(kind);
    const target = stores.get<JsonValue>(kind);
    for (const id of source.ids()) {
      target.set(id, cloneJson(source.get(id) ?? null));
    }
  }
  return {
    formatVersion: world.formatVersion,
    tick: world.tick,
    nextEntityId: world.nextEntityId,
    nextReservationId: world.nextReservationId,
    rng: {
      seed: [world.rng.seed[0], world.rng.seed[1]],
      streams: world.rng.streams.map((stream) => ({
        name: stream.name,
        stream: {
          s: [stream.stream.s[0], stream.stream.s[1], stream.stream.s[2], stream.stream.s[3]],
        },
      })),
    },
    owners: {
      owners: world.owners.owners.map((owner) => ({
        handle: owner.handle,
        knowledge: owner.knowledge.map((entry) => ({ ...entry })),
        accounts: owner.accounts.map((entry) => ({ ...entry })),
        purposeLocks: owner.purposeLocks.map((lock) => ({ ...lock })),
        unlocks: [...owner.unlocks],
        deficitPaused: [...owner.deficitPaused],
      })),
    },
    stores,
    ledger: { reservations: world.ledger.reservations.map((reservation) => ({ ...reservation })) },
    accumulators: { entries: world.accumulators.entries.map((entry) => ({ ...entry })) },
    timers: { timers: world.timers.timers.map((timer) => ({ ...timer })) },
    exchanges: {
      prices: world.exchanges.prices.map((price) => ({
        ...price,
        soldVolume: price.soldVolume.map((entry) => ({ ...entry })),
        boughtVolume: price.boughtVolume.map((entry) => ({ ...entry })),
      })),
    },
    commandQueue: world.commandQueue.map((command) => ({
      ...command,
      command: { ...command.command },
    })),
    modules: {
      enabled: [...world.modules.enabled],
      data: world.modules.data.map((entry) => ({
        module: entry.module,
        value: cloneJson(entry.value),
      })),
    },
    metrics: {
      windows: world.metrics.windows.map((window) => ({ ...window, window: [...window.window] })),
    },
    caches: {
      spatial: undefined,
      connectivity: undefined,
      tags: undefined,
      routes: undefined,
      dirty: true,
    },
  };
}

/**
 * Hashes the canonical state of a world (TDS-19.4):
 * `fnv1a64(canonicalStringify(encodeWorld(world, registry)))`.
 *
 * Source: TDS-8.5, TDS-19.4
 */
export function hashWorld(world: World, registry: Registry): StateHash {
  return fnv1a64(canonicalStringify(encodeWorld(world, registry))) as StateHash;
}
