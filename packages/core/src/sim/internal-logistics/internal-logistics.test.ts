import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createTransactionWriter } from '../../tx/index.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Inventory } from '../../tx/inventory.js';
import type { Location, LocationHub } from '../location.js';
import type { Producer, RecipeSpec, ResourceSource } from '../production/types.js';
import type { CapabilityProvider } from '../capabilities/types.js';
import type { NeedStates } from '../needs/types.js';
import type { Residence } from '../population/types.js';
import { THROUGHPUT_LIMITED_POLICY } from './types.js';
import { isNeedStates } from '../needs/types.js';
import type { ThroughputAllocation, ThroughputPool } from './types.js';

const registry = createEmptyRegistry();
const input: TickInput = { commands: [], options: { journal: false, hash: false } };
const res = (value: number) => definitionHandle(value);

const makeWorld = (): World => {
  const result = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  const world = result.value;
  world.nextEntityId = entityId(100);
  world.owners = {
    owners: [
      {
        handle: ownerHandle(0),
        knowledge: [],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  stores(world)
    .get<Location>('location')
    .set(entityId(1), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 1000,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
    });
  stores(world)
    .get<LocationHub>('locationHub')
    .set(entityId(1), { inventories: [entityId(2)] });
  stores(world)
    .get<Inventory>('inventory')
    .set(entityId(2), {
      owner: ownerHandle(0),
      policy: 'framework.inventory.shared_location',
      revision: 0,
      entries: [],
      capacity: { total: null, perResource: null },
      acceptance: { accepts: [] },
    });
  return world;
};

const setPool = (world: World, base: number, capability: number | null = null): void => {
  const pool: ThroughputPool = {
    policy: THROUGHPUT_LIMITED_POLICY,
    baseCapacity: base,
    baseThroughputCapability: capability === null ? null : definitionHandle(capability),
    capacity: base,
    requested: 0,
    throttlePermille: 1000,
  };
  stores(world).get<ThroughputPool>('throughputPool').set(entityId(1), pool);
};

const setSource = (world: World, entity: number, rate: number): void => {
  const source: ResourceSource = {
    policy: 'infinite_rate',
    location: entityId(1),
    inventory: entityId(2),
    outputs: [{ resource: res(0), rate, remaining: null }],
  };
  stores(world).get<ResourceSource>('resourceSource').set(entityId(entity), source);
};

const batchRecipe: RecipeSpec = {
  recipe: res(0),
  mode: 'batch',
  duration: 10,
  inputs: [{ resource: res(0), quantity: 600 }],
  outputs: [{ resource: res(1), quantity: 400 }],
  capabilities: [],
  condition: null,
};

const setProducer = (world: World, entity: number, producer: Producer): void => {
  stores(world).get<Producer>('producer').set(entityId(entity), producer);
};

const producer = (overrides: Partial<Producer> = {}): Producer => ({
  recipes: [batchRecipe],
  recipe: batchRecipe.recipe,
  processSlots: 1,
  location: entityId(1),
  inputInventory: entityId(2),
  outputInventory: entityId(2),
  state: 'processing',
  blockReasons: [],
  progress: 9,
  inputReservations: [],
  capacityReservations: [],
  ...overrides,
});

const allocationOf = (world: World, entity: number) =>
  stores(world).get<ThroughputAllocation>('throughputAllocation').get(entityId(entity));

const stock = (world: World, resource: number): number => {
  const component = stores(world).get<Inventory>('inventory').get(entityId(2));
  return component?.entries.find((entry) => entry.resource === resource)?.quantity ?? 0;
};

const deposit = (world: World, resource: number, quantity: number): void => {
  const writer = createTransactionWriter(world, null);
  writer.atomic((builder) =>
    builder.deposit({
      inventory: entityId(2),
      resource: res(resource),
      quantity,
      source: entityId(3),
    }),
  );
};

describe('[GDD-6.6][GDD-15.1][TDS-6.3] internal-logistics throughput', () => {
  it('[GDD-15.1] requests within capacity are granted in full', () => {
    const world = makeWorld();
    setPool(world, 6000);
    setSource(world, 3, 1000);
    setProducer(world, 4, producer());
    runPhases(world, registry, [9, 10], input);
    expect(allocationOf(world, 3)?.granted).toBe(1000);
    expect(allocationOf(world, 4)?.granted).toBe(1000);
    expect(allocationOf(world, 4)?.throttlePermille).toBe(1000);
  });

  it('[GDD-15.1] over-capacity requests are throttled proportionally', () => {
    const world = makeWorld();
    setPool(world, 1000);
    setSource(world, 3, 1000);
    setProducer(world, 4, producer());
    runPhases(world, registry, [9, 10], input);
    expect(allocationOf(world, 3)?.granted).toBe(500);
    expect(allocationOf(world, 4)?.granted).toBe(500);
    expect(allocationOf(world, 3)?.throttlePermille).toBe(500);
  });

  it('[TDS-6.3] remainder ties break by ascending entity ID', () => {
    const world = makeWorld();
    setPool(world, 2);
    setSource(world, 3, 1);
    setSource(world, 4, 1);
    setSource(world, 5, 1);
    runPhases(world, registry, [9, 10], input);
    expect(allocationOf(world, 3)?.granted).toBe(1);
    expect(allocationOf(world, 4)?.granted).toBe(1);
    expect(allocationOf(world, 5)?.granted).toBe(0);
  });

  it('[GDD-15.1] a blocked producer requests nothing', () => {
    const world = makeWorld();
    setPool(world, 1000);
    setProducer(world, 4, producer({ state: 'blocked', blockReasons: ['missing_input'] }));
    runPhases(world, registry, [9, 10], input);
    expect(allocationOf(world, 4)).toBeUndefined();
  });

  it('[GDD-15.1] a processing batch producer requests only on its completion tick', () => {
    const world = makeWorld();
    setPool(world, 1000);
    setProducer(world, 4, producer({ progress: 4 }));
    runPhases(world, registry, [9, 10], input);
    expect(allocationOf(world, 4)).toBeUndefined();
  });

  it('[GDD-15.1] a location without internal logistics is unbounded', () => {
    const world = makeWorld();
    setSource(world, 3, 1000);
    runPhases(world, registry, [9, 10], input);
    expect(allocationOf(world, 3)).toBeUndefined();
  });

  it('[GDD-15.1] a throttled source deposits the floored quantity', () => {
    const world = makeWorld();
    setPool(world, 500);
    setSource(world, 3, 1000);
    runPhases(world, registry, [9, 10, 12, 13], input);
    expect(stock(world, 0)).toBe(500);
  });

  it('[GDD-15.1] a throttled completion scales both sides', () => {
    const world = makeWorld();
    deposit(world, 0, 1000);
    const writer = createTransactionWriter(world, null);
    const reserved = writer.reserve({
      inventory: entityId(2),
      resource: res(0),
      quantity: 600,
      purpose: 'production_input',
      holder: entityId(4),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    setProducer(world, 4, producer({ progress: 10, inputReservations: [reserved.value.id] }));
    stores(world)
      .get<ThroughputAllocation>('throughputAllocation')
      .set(entityId(4), {
        location: entityId(1),
        requested: 1000,
        granted: 500,
        throttlePermille: 500,
      });
    runPhases(world, registry, [13], input);
    expect(stock(world, 0)).toBe(700);
    expect(stock(world, 1)).toBe(200);
    expect(stores(world).get<Producer>('producer').get(entityId(4))?.state).toBe('idle');
  });

  it('[GDD-15.1] zero throttle keeps the batch process waiting', () => {
    const world = makeWorld();
    deposit(world, 0, 1000);
    const writer = createTransactionWriter(world, null);
    const reserved = writer.reserve({
      inventory: entityId(2),
      resource: res(0),
      quantity: 600,
      purpose: 'production_input',
      holder: entityId(4),
    });
    if (!reserved.ok) throw new Error('reserve failed');
    setProducer(world, 4, producer({ progress: 10, inputReservations: [reserved.value.id] }));
    stores(world)
      .get<ThroughputAllocation>('throughputAllocation')
      .set(entityId(4), {
        location: entityId(1),
        requested: 1000,
        granted: 0,
        throttlePermille: 0,
      });
    runPhases(world, registry, [13], input);
    const state = stores(world).get<Producer>('producer').get(entityId(4));
    expect(state?.state).toBe('processing');
    expect(state?.progress).toBe(10);
    expect(stock(world, 0)).toBe(1000);
  });

  it('[GDD-6.6] capacity adds the configured capability supply', () => {
    const world = makeWorld();
    setPool(world, 6000, 7);
    stores(world)
      .get<CapabilityProvider>('capabilityProvider')
      .set(entityId(6), {
        capability: res(7),
        scope: 'location',
        location: entityId(1),
        rate: 2000,
      });
    setSource(world, 3, 1000);
    runPhases(world, registry, [9, 10], input);
    const pool = stores(world).get<ThroughputPool>('throughputPool').get(entityId(1));
    expect(pool?.capacity).toBe(8000);
  });

  it('[GDD-15.1] a residence consumption demand is collected', () => {
    const world = makeWorld();
    setPool(world, 1000);
    const residence: Residence = {
      tier: res(0),
      capacity: 10,
      location: entityId(1),
      growthPolicy: null,
      consumptionFactor: 1000,
      outputs: [],
      needs: [
        {
          need: res(1),
          category: res(2),
          type: 'resource_consumption',
          resource: res(0),
          quantityPerPopulationPerTick: 1,
          measurementWindowTicks: 10,
          targetRatio: 1000,
        },
      ],
      categories: [],
      satisfactionAggregation: 'average',
    };
    stores(world).get<Residence>('residence').set(entityId(6), residence);
    stores(world)
      .get<NeedStates>('needStates')
      .set(entityId(6), { needs: [{ need: res(1), demanded: 400, window: [] }] });
    runPhases(world, registry, [9, 10], input);
    expect(allocationOf(world, 6)?.requested).toBe(400);
  });

  it('[GDD-15.1] a throttled need delivery consumes less', () => {
    const world = makeWorld();
    deposit(world, 0, 400);
    const residence: Residence = {
      tier: res(0),
      capacity: 10,
      location: entityId(1),
      growthPolicy: null,
      consumptionFactor: 1000,
      outputs: [],
      needs: [
        {
          need: res(1),
          category: res(2),
          type: 'resource_consumption',
          resource: res(0),
          quantityPerPopulationPerTick: 1,
          measurementWindowTicks: 10,
          targetRatio: 1000,
        },
      ],
      categories: [],
      satisfactionAggregation: 'average',
    };
    stores(world).get<Residence>('residence').set(entityId(6), residence);
    const needs: NeedStates = { needs: [{ need: res(1), demanded: 400, window: [] }] };
    if (!isNeedStates(needs)) throw new Error('invalid need states');
    stores(world).get<NeedStates>('needStates').set(entityId(6), needs);
    stores(world)
      .get<ThroughputAllocation>('throughputAllocation')
      .set(entityId(6), {
        location: entityId(1),
        requested: 400,
        granted: 100,
        throttlePermille: 250,
      });
    runPhases(world, registry, [20], input);
    expect(stock(world, 0)).toBe(300);
  });

  it('[GDD-15.1] a throttled requester emits one event', () => {
    const world = makeWorld();
    setPool(world, 500);
    setSource(world, 3, 1000);
    const output = runPhases(world, registry, [9, 10], input);
    const event = output.events.find((entry) => entry.type === 'ThroughputThrottled');
    expect(event?.payload).toEqual({ requested: 1000, granted: 500, throttle_permille: 500 });
  });
});
