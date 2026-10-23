import { describe, expect, it } from 'vitest';
import { allocateEntity } from '../../world/create.js';
import { createWorld } from '../../world/create.js';
import { createEmptyRegistry } from '../../registry/types.js';
import type { World } from '../../world/types.js';
import { definitionHandle, entityId, ownerHandle, stringId } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { PhaseId } from '../../pipeline/types.js';
import type { Inventory } from '../../tx/inventory.js';
import { instantiateWorld } from '../instantiate.js';
import type { WorldPlan } from '../instantiate.js';
import { locationOf } from '../location.js';
import type { Cargo, TransportHandling, TransportMovement, TransportOrder } from './types.js';
import {
  assignTransport,
  createTransportOrder,
  defaultFailurePolicies,
  deleteTransportOrder,
} from './orders.js';

const resource = definitionHandle(0);

const build = (throughput: number): { world: World; unit: number; order: number } => {
  const created = createWorld(createEmptyRegistry(), {
    seed: [0, 0],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const world = created.value;
  const plan: WorldPlan = {
    owner: ownerHandle(0),
    locations: [
      {
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
        internalLogistics: {
          policy: 'framework.inventory.throughput_limited',
          baseThroughput: throughput,
          baseThroughputCapability: null,
        },
      },
      {
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
        internalLogistics: {
          policy: 'framework.inventory.throughput_limited',
          baseThroughput: throughput,
          baseThroughputCapability: null,
        },
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
  const inventoryStore = world.stores.get<Inventory>('inventory');
  inventoryStore.set(entityId(2), {
    ...(inventoryStore.get(entityId(2)) as Inventory),
    entries: [{ resource, quantity: 100 }],
  });
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
    mode: 'route',
    stations: [
      { endpoint: entityId(1), actions: [{ resource, action: 'load', rule: { mode: 'all' } }] },
      { endpoint: entityId(3), actions: [{ resource, action: 'unload', rule: { mode: 'all' } }] },
    ],
    pathPolicy: 'shortest_stable',
    repeat: true,
    retryIntervalTicks: 20,
    failurePolicies: defaultFailurePolicies(),
  });
  assignTransport(world, entityId(unit), entityId(order));
  return { world, unit, order };
};

const phases: readonly PhaseId[] = [9, 10, 14, 16, 19];

const run = (world: World, ticks: number): void => {
  for (let tick = 0; tick < ticks; tick += 1) {
    runPhases(world, createEmptyRegistry(), phases, {
      commands: [],
      options: { journal: false, hash: false },
    });
  }
};

describe('[GDD-15.2][GDD-15.5] route order execution', () => {
  it('[GDD-15.2] a unit loads at the origin, travels, and unloads at the destination', () => {
    const { world, unit } = build(1000);
    run(world, 22);
    const cargo = world.stores.get<Cargo>('cargo').get(entityId(unit));
    expect(cargo?.entries).toEqual([]);
    const destination = world.stores.get<Inventory>('inventory').get(entityId(4));
    expect(destination?.entries).toEqual([{ resource, quantity: 100 }]);
    expect(world.stores.get<TransportMovement>('movement').get(entityId(unit))?.location).toBe(
      entityId(1),
    );
  });

  it('[GDD-15.1] handling is throttled by location throughput', () => {
    const { world, unit } = build(5);
    run(world, 10);
    const cargo = world.stores.get<Cargo>('cargo').get(entityId(unit));
    expect(cargo?.entries).toEqual([{ resource, quantity: 50 }]);
    const origin = world.stores.get<Inventory>('inventory').get(entityId(2));
    expect(origin?.entries).toEqual([{ resource, quantity: 50 }]);
  });

  it('[GDD-15.7] a path failure with skip advances the station', () => {
    const { world, order } = build(1000);
    const component = world.stores.get<TransportOrder>('transportOrder').get(entityId(order));
    if (component === undefined) throw new Error('order missing');
    world.stores.get<TransportOrder>('transportOrder').set(entityId(order), {
      ...component,
      failurePolicies: { ...component.failurePolicies, path_unavailable: 'skip' },
    });
    world.stores.get<TransportMovement>('movement').set(entityId(5), {
      ...(world.stores.get<TransportMovement>('movement').get(entityId(5)) as TransportMovement),
      location: entityId(3),
    });
    world.stores.get('location').set(entityId(3), {
      ...(locationOf(world, entityId(3)) as NonNullable<ReturnType<typeof locationOf>>),
      connections: [],
    });
    runPhases(world, createEmptyRegistry(), [14], {
      commands: [],
      options: { journal: false, hash: false },
    });
    const cursor = world.stores.get('stationCursor').get(entityId(5)) as
      { station: number } | undefined;
    expect(cursor?.station).toBe(1);
  });

  it('[GDD-15.7] a path failure with retry keeps the cursor', () => {
    const { world, order } = build(1000);
    void order;
    world.stores.get<TransportMovement>('movement').set(entityId(5), {
      ...(world.stores.get<TransportMovement>('movement').get(entityId(5)) as TransportMovement),
      location: entityId(3),
    });
    world.stores.get('location').set(entityId(3), {
      ...(locationOf(world, entityId(3)) as NonNullable<ReturnType<typeof locationOf>>),
      connections: [],
    });
    runPhases(world, createEmptyRegistry(), [14], {
      commands: [],
      options: { journal: false, hash: false },
    });
    const cursor = world.stores.get('stationCursor').get(entityId(5)) as
      { station: number } | undefined;
    expect(cursor?.station).toBe(0);
  });

  it('[GDD-15.2] deleting an order unassigns its unit', () => {
    const { world, unit, order } = build(1000);
    expect(deleteTransportOrder(world, entityId(order))).toBe(true);
    const assignment = world.stores.get('transportAssignment').get(entityId(unit)) as
      { order: number | null } | undefined;
    expect(assignment?.order).toBeNull();
    expect(world.stores.get('transportOrder').has(entityId(order))).toBe(false);
  });

  it('[GDD-15.6] a completed order repeats to its first station', () => {
    const { world, unit, order } = build(1000);
    run(world, 23);
    const assignment = world.stores.get('transportAssignment').get(entityId(unit)) as
      { order: number | null } | undefined;
    expect(assignment?.order).toBe(order);
    expect(locationOf(world, entityId(1))).toBeDefined();
  });
});
