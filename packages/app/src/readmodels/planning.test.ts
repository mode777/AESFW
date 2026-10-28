import { describe, expect, it } from 'vitest';
import { ids, instantiateWorld } from '@aesfw/core';
import type { Maintenance, Producer, World } from '@aesfw/core';
import type { CompiledContent } from '@aesfw/content';
import { createSession } from '../session/session.js';
import { planningMetrics } from './planning.js';

const IDS: Record<string, number> = {
  'test.resource.ore': 6,
  'test.resource.metal': 7,
  'test.resource.cap': 8,
  'test.recipe.extract': 41,
  'test.recipe.refine': 42,
  'test.entity.extractor': 30,
  'test.entity.refiner': 31,
  'test.tier.a': 32,
};

const registry: CompiledContent['registry'] = {
  stringIdOf: (type, handle) => {
    for (const [id, value] of Object.entries(IDS)) {
      if (value === handle && id.startsWith(`test.${type}`) === false) continue;
      if (value === handle && id.startsWith(`test.${type}`)) return ids.stringId(id);
    }
    return null;
  },
  handleOf: (type, id) => {
    const value = IDS[id as string];
    if (value === undefined) return null;
    return id.startsWith(`test.${type}`) ? ids.definitionHandle(value) : null;
  },
  definitionDataOf: () => null,
  handlesOf: () => [],
};

const ORE = ids.definitionHandle(6);
const METAL = ids.definitionHandle(7);
const CAP = ids.definitionHandle(8);

const content: CompiledContent = {
  registry,
  checksum: 'checksum.1',
  packages: [],
  presentation: null,
};

const recipe = (
  handle: number,
  inputs: readonly { resource: number; quantity: number }[],
  outputs: readonly { resource: number; quantity: number }[],
) => ({
  recipe: ids.definitionHandle(handle),
  mode: 'batch' as const,
  duration: 10,
  inputs: inputs.map((line) => ({
    resource: ids.definitionHandle(line.resource),
    quantity: line.quantity,
  })),
  outputs: outputs.map((line) => ({
    resource: ids.definitionHandle(line.resource),
    quantity: line.quantity,
  })),
  capabilities: [{ resource: CAP, quantity: 1 }],
  condition: null,
});

const producerComponent = (recipeHandle: number): Producer => ({
  recipes: [recipe(recipeHandle, [], [{ resource: ORE, quantity: 30 }])],
  recipe: ids.definitionHandle(recipeHandle),
  processSlots: 1,
  location: ids.entityId(1),
  inputInventory: null,
  outputInventory: null,
  state: 'idle',
  blockReasons: [],
  progress: 0,
  inputReservations: [],
  capacityReservations: [],
});

const makeSession = () => {
  const created = createSession(content, {
    sessionId: 'session.1',
    seed: [1, 2],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner.1',
  });
  if (!created.ok) throw new Error('session creation failed');
  const state = created.value;
  // Planning tests assume a fully known world.
  state.world.owners = {
    owners: [
      {
        handle: ids.ownerHandle(0),
        knowledge: [{ location: ids.entityId(1), level: 'established' }],
        accounts: [],
        purposeLocks: [],
        unlocks: [],
        deficitPaused: [],
      },
    ],
  };
  return state;
};

const addProducer = (
  world: World,
  entity: number,
  definition: number,
  recipeHandle: number,
  inputs: readonly { resource: number; quantity: number }[],
  outputs: readonly { resource: number; quantity: number }[],
): void => {
  const id = ids.entityId(entity);
  const component = producerComponent(recipeHandle);
  world.stores.get<Producer>('producer').set(id, {
    ...component,
    recipes: [recipe(recipeHandle, inputs, outputs)],
    recipe: ids.definitionHandle(recipeHandle),
  });
  world.stores
    .get<{ definition: number }>('definition')
    .set(id, { definition: ids.definitionHandle(definition) });
  world.stores.get<{ owner: ids.OwnerHandle }>('owner').set(id, { owner: ids.ownerHandle(0) });
  world.stores.get('footprint').set(id, { width: 2, height: 2 });
  world.stores.get<Maintenance>('maintenance').set(id, {
    intervalTicks: 10,
    inputs: [{ resource: ORE, quantity: 100 }],
    chargePolicy: 'while_enabled',
    shortagePolicy: 'ignore',
    arrears: [],
  });
};

const economySession = () => {
  const state = makeSession();
  instantiateWorld(state.world, {
    owner: ids.ownerHandle(0),
    locations: [
      {
        template: ids.definitionHandle(1),
        spatialPolicy: 'abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [],
      },
    ],
  });
  const world = state.world;
  addProducer(world, 20, 30, 41, [], [{ resource: 6, quantity: 30 }]);
  addProducer(world, 21, 30, 41, [], [{ resource: 6, quantity: 30 }]);
  addProducer(world, 22, 31, 42, [{ resource: 6, quantity: 20 }], [{ resource: 7, quantity: 10 }]);
  addProducer(world, 23, 31, 42, [{ resource: 6, quantity: 20 }], [{ resource: 7, quantity: 10 }]);
  world.stores
    .get<{ owner: ids.OwnerHandle }>('owner')
    .set(ids.entityId(24), { owner: ids.ownerHandle(0) });
  world.stores.get('residence').set(ids.entityId(24), {
    tier: ids.definitionHandle(32),
    capacity: 10,
    location: ids.entityId(1),
    growthPolicy: null,
    consumptionFactor: 1000,
    outputs: [],
    needs: [
      {
        need: ids.definitionHandle(50),
        category: ids.definitionHandle(51),
        type: 'resource_consumption',
        resource: METAL,
        quantityPerPopulationPerTick: 2,
        measurementWindowTicks: 1,
        targetRatio: 1000,
      },
    ],
    categories: [],
    satisfactionAggregation: 'average',
  });
  world.stores
    .get('populationGroup')
    .set(ids.entityId(24), { tier: ids.definitionHandle(32), count: 1, capacity: 10 });
  return state;
};

describe('[PIC-10.5] planning metrics', () => {
  it('[SCN-18][GDD-3.8] supported population matches the hand calculation', () => {
    const state = economySession();
    const planning = planningMetrics(state, ids.ownerHandle(0));
    expect(planning.resources).toHaveLength(1);
    const metal = planning.resources[0];
    expect(metal?.resource_id).toBe('test.resource.metal');
    const ownerScope = metal?.scopes.find((scope) => scope.scope === 'owner');
    expect(ownerScope?.net_per_tick).toBe(2);
    expect(ownerScope?.tiers).toEqual([
      {
        tier_id: 'test.tier.a',
        per_capita_permille: 2000,
        supported: 1,
        consuming_population: 1,
        coverage_permille: 1000,
      },
    ]);
  });

  it('[SCN-18][PIC-10.5] per-capita demand does not scale with the residence count', () => {
    const state = economySession();
    // A second residence of the same tier: supported population is the chain's
    // rate divided by the tier's per-capita demand, not by the sum over houses.
    const template = state.world.stores
      .get<{ readonly tier: number; readonly consumptionFactor: number }>('residence')
      .get(ids.entityId(24));
    if (template === undefined) throw new Error('missing residence');
    const group = state.world.stores
      .get<{ readonly count: number; readonly capacity: number }>('populationGroup')
      .get(ids.entityId(24));
    if (group === undefined) throw new Error('missing group');
    state.world.stores.get('residence').set(ids.entityId(25), { ...template });
    state.world.stores.get('populationGroup').set(ids.entityId(25), { ...group });
    state.world.stores.get('owner').set(ids.entityId(25), { owner: ids.ownerHandle(0) });
    const planning = planningMetrics(state, ids.ownerHandle(0));
    const ownerScope = planning.resources[0]?.scopes.find((scope) => scope.scope === 'owner');
    expect(ownerScope?.tiers[0]?.per_capita_permille).toBe(2000);
    expect(ownerScope?.tiers[0]?.supported).toBe(1);
  });

  it('[PIC-10.5] the location scope mirrors an owner with one location', () => {
    const state = economySession();
    const planning = planningMetrics(state, ids.ownerHandle(0));
    const metal = planning.resources[0];
    const locationScope = metal?.scopes.find((scope) => scope.scope === 'location');
    expect(locationScope?.location_id).toBe(1);
    expect(locationScope?.net_per_tick).toBe(2);
    expect(locationScope?.tiers[0]?.supported).toBe(1);
  });

  it('[PIC-10.5] a negative net rate supports nobody', () => {
    const state = economySession();
    // Remove one extractor stage: ore net drops to 3 - 4 = -1, but metal stays +2.
    // Starve the metal chain instead by removing both refiner outputs.
    const producer = state.world.stores.get<Producer>('producer').get(ids.entityId(22));
    if (producer === undefined) throw new Error('producer missing');
    state.world.stores.get<Producer>('producer').set(ids.entityId(22), {
      ...producer,
      recipes: [recipe(42, [{ resource: 6, quantity: 20 }], [{ resource: 7, quantity: 0 }])],
    });
    state.world.stores.get<Producer>('producer').set(ids.entityId(23), {
      ...producer,
      recipes: [recipe(42, [{ resource: 6, quantity: 20 }], [{ resource: 7, quantity: 0 }])],
    });
    const planning = planningMetrics(state, ids.ownerHandle(0));
    const metal = planning.resources[0];
    const ownerScope = metal?.scopes.find((scope) => scope.scope === 'owner');
    expect(ownerScope?.net_per_tick).toBe(0);
    expect(ownerScope?.tiers[0]?.supported).toBe(0);
    expect(ownerScope?.tiers[0]?.coverage_permille).toBe(0);
  });

  it('[GDD-10.6] chain stages carry counts, ratios, footprint, and demand', () => {
    const state = economySession();
    const planning = planningMetrics(state, ids.ownerHandle(0));
    const ore = planning.chains.find((chain) => chain.resource_id === 'test.resource.ore');
    const metal = planning.chains.find((chain) => chain.resource_id === 'test.resource.metal');
    expect(ore?.output_per_tick).toBe(6);
    expect(metal?.output_per_tick).toBe(2);
    expect(ore?.stages).toEqual([
      {
        definition_id: 'test.entity.extractor',
        count: 2,
        ratio: 1,
        output_per_tick: 6,
        footprint: 8,
        maintenance_per_interval: 200,
        capability_demand: { 'test.resource.cap': 2 },
      },
      {
        definition_id: 'test.entity.refiner',
        count: 2,
        ratio: 1,
        output_per_tick: 0,
        footprint: 8,
        maintenance_per_interval: 200,
        capability_demand: { 'test.resource.cap': 2 },
      },
    ]);
    expect(metal?.stages).toHaveLength(1);
    expect(metal?.stages[0]?.definition_id).toBe('test.entity.refiner');
    expect(metal?.stages[0]?.output_per_tick).toBe(2);
  });

  it('[GDD-10.6] stage ratios reduce by the greatest common divisor', () => {
    const state = economySession();
    // Remove one refiner: counts 2 and 1 → ratios 2 and 1.
    const producer = state.world.stores.get<Producer>('producer').get(ids.entityId(23));
    if (producer === undefined) throw new Error('producer missing');
    state.world.stores.get<Producer>('producer').markRemoved(ids.entityId(23));
    const planning = planningMetrics(state, ids.ownerHandle(0));
    const ore = planning.chains.find((chain) => chain.resource_id === 'test.resource.ore');
    expect(ore?.stages.map((stage) => [stage.count, stage.ratio])).toEqual([
      [2, 2],
      [1, 1],
    ]);
  });
});
