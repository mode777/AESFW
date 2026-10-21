import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Inventory } from '../../tx/inventory.js';
import type { Location } from '../location.js';
import type { PopulationGroup, Residence } from '../population/types.js';
import type { CategorySpec, NeedSpec, Satisfaction } from './types.js';

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
  stores(world)
    .get<Location>('location')
    .set(entityId(1), {
      template: res(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 1000,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
    });
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
  stores(world)
    .get('locationHub')
    .set(entityId(1), { inventories: [entityId(2)] });
  return world;
};

const setStock = (world: World, resource: number, quantity: number): void => {
  const store = stores(world).get<Inventory>('inventory');
  const component = store.get(entityId(2));
  if (component === undefined) return;
  store.set(entityId(2), {
    ...component,
    entries: quantity === 0 ? [] : [{ resource: res(resource), quantity }],
  });
};

const stockOf = (world: World, resource: number): number => {
  const component = stores(world).get<Inventory>('inventory').get(entityId(2));
  return component?.entries.find((entry) => entry.resource === resource)?.quantity ?? 0;
};

const need = (overrides: Partial<NeedSpec> = {}): NeedSpec => ({
  need: res(0),
  category: res(0),
  type: 'resource_consumption',
  resource: res(10),
  quantityPerPopulationPerTick: 2,
  measurementWindowTicks: 1,
  targetRatio: 1000,
  ...overrides,
});

const category = (overrides: Partial<CategorySpec> = {}): CategorySpec => ({
  category: res(0),
  mode: 'all',
  requiredScore: 1000,
  members: [{ need: res(0), weight: 1000 }],
  ...overrides,
});

const setResidence = (
  world: World,
  count: number,
  needSpec: NeedSpec,
  categorySpec: CategorySpec,
  aggregation: Residence['satisfactionAggregation'] = 'average',
): void => {
  const residence: Residence = {
    tier: res(0),
    capacity: 100,
    location: entityId(1),
    growthPolicy: null,
    consumptionFactor: 1000,
    outputs: [],
    needs: [needSpec],
    categories: [categorySpec],
    satisfactionAggregation: aggregation,
  };
  const group: PopulationGroup = { tier: res(0), count, capacity: 100 };
  stores(world).get<Residence>('residence').set(entityId(3), residence);
  stores(world).get<PopulationGroup>('populationGroup').set(entityId(3), group);
};

const satisfactionOf = (world: World) =>
  stores(world).get<Satisfaction>('satisfaction').get(entityId(3));

describe('[GDD-12] needs and satisfaction', () => {
  it('[GDD-12.4] demand scales with population and factor', () => {
    const world = makeWorld();
    setStock(world, 10, 1000);
    setResidence(world, 10, need(), category());
    runPhases(world, registry, [8], input);
    expect(stores(world).get('needStates').get(entityId(3))).toMatchObject({
      needs: [{ demanded: 20 }],
    });
  });

  it('[GDD-12.2] a consumption need consumes its resource', () => {
    const world = makeWorld();
    setStock(world, 10, 50);
    setResidence(world, 10, need(), category());
    runPhases(world, registry, [8, 20, 21], input);
    expect(stockOf(world, 10)).toBe(30);
    expect(satisfactionOf(world)?.z).toBe(1000);
  });

  it('[GDD-12.2] delivery is limited by availability', () => {
    const world = makeWorld();
    setStock(world, 10, 5);
    setResidence(world, 10, need(), category());
    runPhases(world, registry, [8, 20, 21], input);
    expect(stockOf(world, 10)).toBe(0);
    expect(satisfactionOf(world)?.z).toBe(250);
  });

  it('[GDD-12.2] an availability need does not consume', () => {
    const world = makeWorld();
    setStock(world, 10, 50);
    setResidence(world, 10, need({ type: 'resource_availability' }), category());
    runPhases(world, registry, [8, 20, 21], input);
    expect(stockOf(world, 10)).toBe(50);
    expect(satisfactionOf(world)?.z).toBe(1000);
  });

  it('[GDD-12.3] weighted score rewards depth', () => {
    const world = makeWorld();
    setStock(world, 10, 50);
    const weighted = category({
      mode: 'weighted_score',
      requiredScore: 2000,
      members: [{ need: res(0), weight: 2000 }],
    });
    setResidence(world, 10, need(), weighted);
    runPhases(world, registry, [8, 20, 21], input);
    expect(satisfactionOf(world)?.z).toBe(1000);
  });

  it('[GDD-12.5] minimum aggregation takes the weakest category', () => {
    const world = makeWorld();
    setStock(world, 10, 5);
    setResidence(world, 10, need(), category(), 'minimum');
    runPhases(world, registry, [8, 20, 21], input);
    expect(satisfactionOf(world)?.z).toBe(250);
  });

  it('[INV-08] fulfillment stays within bounds', () => {
    const world = makeWorld();
    setStock(world, 10, 5);
    setResidence(world, 10, need(), category());
    runPhases(world, registry, [8, 20, 21], input);
    const satisfaction = satisfactionOf(world);
    expect(satisfaction?.z).toBeGreaterThanOrEqual(0);
    expect(satisfaction?.z).toBeLessThanOrEqual(1000);
  });
});
