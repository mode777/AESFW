/**
 * Integration tests for explore orders and discovery (GDD-16.2, ARCH-14.4):
 * an explore order traverses its stations through the real phases and every
 * arrival raises the owner's knowledge, without handling.
 *
 * Source: GDD-16.1, GDD-16.2, ARCH-14.4
 */
import { describe, expect, it } from 'vitest';
import { allocateEntity, createWorld } from '../world/create.js';
import { createEmptyRegistry } from '../registry/types.js';
import type { World } from '../world/types.js';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import type { EntityId } from '../ids/index.js';
import { runPhases } from '../pipeline/step.js';
import type { PhaseId } from '../pipeline/types.js';
import { instantiateWorld } from './instantiate.js';
import type { WorldPlan } from './instantiate.js';
import {
  assignTransport,
  createTransportOrder,
  defaultFailurePolicies,
} from './transport/orders.js';
import type { Cargo, TransportHandling, TransportMovement } from './transport/types.js';

const phases: readonly PhaseId[] = [9, 10, 14, 16, 18, 19];

const build = (): { world: World; unit: EntityId; order: EntityId } => {
  const created = createWorld(createEmptyRegistry(), {
    seed: [0, 0],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  const location = (): WorldPlan['locations'][number] => ({
    template: definitionHandle(0),
    spatialPolicy: 'framework.spatial.abstract_capacity',
    capacity: 100,
    properties: [],
    region: null,
    active: true,
    inventories: [
      {
        capacity: { total: 1000, perResource: null },
        acceptance: { accepts: [] },
        policy: 'framework.inventory.shared_location',
      },
    ],
  });
  const plan: WorldPlan = {
    owner: ownerHandle(0),
    locations: [location(), location()],
    owners: [
      {
        handle: ownerHandle(0),
        accounts: [],
        knowledge: [{ locationIndex: 0, level: 'established' }],
      },
    ],
    connections: [
      {
        id: stringId('test.conn.a_b'),
        definition: definitionHandle(1),
        originIndex: 0,
        destinationIndex: 1,
        direction: 'bidirectional',
        baseDurationTicks: 1,
        enabled: true,
        allowedTransportTags: [],
      },
    ],
  };
  instantiateWorld(world, plan);
  const unit = allocateEntity(world);
  world.stores.get<{ owner: number }>('owner').set(unit, { owner: 0 });
  world.stores.get<Cargo>('cargo').set(unit, {
    policy: 'unrestricted',
    slotCapacity: 100,
    slots: [],
    entries: [],
    accepts: [],
  });
  world.stores.get<TransportMovement>('movement').set(unit, {
    speedPermille: 1000,
    mode: 'physical',
    allowedConnectionTags: [],
    location: entityId(1),
  });
  world.stores.get<TransportHandling>('handling').set(unit, {
    loadingRatePerTick: 10,
    unloadingRatePerTick: 10,
  });
  const order = createTransportOrder(world, ownerHandle(0), {
    mode: 'explore',
    stations: [
      { endpoint: entityId(3), actions: [] },
      { endpoint: entityId(1), actions: [] },
    ],
    pathPolicy: 'shortest_stable',
    repeat: false,
    retryIntervalTicks: 20,
    failurePolicies: defaultFailurePolicies(),
  });
  assignTransport(world, unit, order);
  return { world, unit: entityId(unit), order: entityId(order) };
};

const run = (world: World, ticks: number): void => {
  for (let tick = 0; tick < ticks; tick += 1) {
    runPhases(world, createEmptyRegistry(), phases, {
      commands: [],
      options: { journal: false, hash: false },
    });
  }
};

const knowledgeOf = (world: World, owner: number, location: number): string =>
  world.owners.owners[owner]?.knowledge.find((entry) => entry.location === location)?.level ??
  'unknown';

describe('[GDD-16.2][ARCH-14.4] explore orders', () => {
  it('[GDD-16.2] an explore order discovers both stations', () => {
    const { world } = build();
    run(world, 10);
    expect(knowledgeOf(world, 0, 3)).toBe('discovered');
    expect(knowledgeOf(world, 0, 1)).toBe('established');
    expect(knowledgeOf(world, 0, 2)).toBe('unknown');
  });

  it('[ARCH-14.4] an explore order requests no handling', () => {
    const { world, unit } = build();
    run(world, 3);
    const allocations = world.stores
      .get<{ unit: number; requested: number }>('throughputAllocation')
      .ids()
      .map((entity) =>
        world.stores.get<{ unit: number; requested: number }>('throughputAllocation').get(entity),
      )
      .filter((allocation) => allocation !== undefined);
    for (const allocation of allocations) {
      expect(allocation.unit).not.toBe(unit);
    }
    expect(allocations).toHaveLength(0);
  });

  it('[GDD-16.2] a completed non-repeating explore order releases its unit', () => {
    const { world, unit } = build();
    run(world, 12);
    const assignment = world.stores.get<{ order: number | null }>('transportAssignment').get(unit);
    expect(assignment?.order ?? null).toBeNull();
  });
});
