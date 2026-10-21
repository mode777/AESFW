/**
 * World creation and allocators (TDS-8.1, TDS-10.1). Allocation mutates the
 * world in place under the owned-mutation rule (TDS-5.2); identifiers are
 * monotonic and never reused (ARCH-3.1, INV-10).
 *
 * Source: TDS-7, TDS-8.1, TDS-10.1, ARCH-3.1
 */
import { compareStrings } from '../det/index.js';
import type { Diagnostic } from '../errors/diagnostic.js';
import { entityId, reservationId, tick } from '../ids/index.js';
import type { EntityId, ReservationId } from '../ids/index.js';
import { ok } from '../result.js';
import type { Result } from '../result.js';
import type { Registry } from '../registry/types.js';
import { createComponentStores } from './component-store.js';
import { WORLD_FORMAT_VERSION } from './types.js';
import type { World, WorldSetup } from './types.js';

/**
 * Creates a fresh, empty world (TDS-8.1, TDS-10.1). The world definition and
 * `tickDurationMs` are not consumed in M0: content loading is roadmap 1.1+ and
 * tick duration is session state (TDS-19.1), not world state.
 *
 * Source: TDS-8.1, TDS-10.1
 */
export function createWorld(registry: Registry, setup: WorldSetup): Result<World, Diagnostic[]> {
  void registry;
  const enabled = [...setup.enabledModules].sort(compareStrings);
  const world: World = {
    formatVersion: WORLD_FORMAT_VERSION,
    tick: tick(0),
    nextEntityId: entityId(1),
    nextReservationId: reservationId(1),
    rng: { seed: setup.seed, streams: [] },
    owners: { owners: [] },
    stores: createComponentStores(),
    ledger: { reservations: [] },
    accumulators: { entries: [] },
    timers: { timers: [] },
    exchanges: { prices: [] },
    commandQueue: [],
    modules: { enabled, data: [] },
    metrics: { windows: [] },
    caches: {
      spatial: undefined,
      connectivity: undefined,
      tags: undefined,
      routes: undefined,
      dirty: true,
    },
  };
  return ok(world);
}

/**
 * Allocates the next entity ID and advances `nextEntityId` (TDS-7, INV-10).
 *
 * Source: TDS-7, TDS-8.1, ARCH-3.1
 */
export function allocateEntity(world: World): EntityId {
  const id = world.nextEntityId;
  world.nextEntityId = entityId(id + 1);
  return id;
}

/**
 * Allocates the next reservation ID and advances `nextReservationId`
 * (TDS-7, INV-10).
 *
 * Source: TDS-7, TDS-8.1
 */
export function allocateReservation(world: World): ReservationId {
  const id = world.nextReservationId;
  world.nextReservationId = reservationId(id + 1);
  return id;
}
