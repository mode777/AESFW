import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { runPhases } from '../../pipeline/step.js';
import type { TickInput } from '../../pipeline/types.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Inventory } from '../../tx/inventory.js';
import { locationOf } from '../location.js';
import type { Location } from '../location.js';
import type { Producer, RecipeSpec, ResourceSource } from './types.js';

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

const setSource = (world: World, entity: number, source: ResourceSource): void => {
  stores(world).get<ResourceSource>('resourceSource').set(entityId(entity), source);
};

const setProducer = (world: World, entity: number, producer: Producer): void => {
  stores(world).get<Producer>('producer').set(entityId(entity), producer);
};

const producerOf = (world: World, entity: number) =>
  stores(world).get<Producer>('producer').get(entityId(entity));

const stock = (world: World, inventory: number, resource: number): number => {
  const component = stores(world).get<Inventory>('inventory').get(entityId(inventory));
  return component?.entries.find((entry) => entry.resource === resource)?.quantity ?? 0;
};

const batchRecipe: RecipeSpec = {
  recipe: res(0),
  mode: 'batch',
  duration: 10,
  inputs: [{ resource: res(0), quantity: 1000 }],
  outputs: [{ resource: res(1), quantity: 1000 }],
  capabilities: [],
  condition: null,
};

const producer = (recipe: RecipeSpec, overrides: Partial<Producer> = {}): Producer => ({
  recipes: [recipe],
  recipe: recipe.recipe,
  processSlots: 1,
  location: entityId(1),
  inputInventory: entityId(2),
  outputInventory: entityId(2),
  state: 'idle',
  blockReasons: [],
  progress: 0,
  inputReservations: [],
  capacityReservations: [],
  ...overrides,
});

const source = (rate: number): ResourceSource => ({
  policy: 'infinite_rate',
  location: entityId(1),
  inventory: entityId(2),
  outputs: [{ resource: res(0), rate, remaining: null }],
});

describe('[GDD-4.3][GDD-10] production processes', () => {
  it('[GDD-10.2] a missing input blocks the start', () => {
    const world = makeWorld();
    setProducer(world, 4, producer(batchRecipe));
    runPhases(world, registry, [7, 11], input);
    expect(producerOf(world, 4)?.state).toBe('blocked');
    expect(producerOf(world, 4)?.blockReasons).toEqual(['missing_input']);
  });

  it('[GDD-10.3] a missing capability blocks the start', () => {
    const world = makeWorld();
    const recipe: RecipeSpec = {
      ...batchRecipe,
      capabilities: [{ resource: res(5), quantity: 1 }],
    };
    setProducer(world, 4, producer(recipe));
    runPhases(world, registry, [7, 11], input);
    expect(producerOf(world, 4)?.blockReasons).toEqual(['missing_capability']);
  });

  it('[INV-15] a batch producer completes and consumes inputs', () => {
    const world = makeWorld();
    setSource(world, 3, source(1000));
    setProducer(world, 4, producer(batchRecipe));
    for (let tick = 0; tick < 11; tick += 1) {
      runPhases(world, registry, [7, 11, 12, 13], input);
    }
    expect(stock(world, 2, 1)).toBe(1000);
    expect(producerOf(world, 4)?.state).toBe('idle');
  });

  it('[GDD-10.4] a continuous producer commits each tick', () => {
    const world = makeWorld();
    const recipe: RecipeSpec = {
      ...batchRecipe,
      mode: 'continuous',
      inputs: [{ resource: res(0), quantity: 1000 }],
      outputs: [{ resource: res(1), quantity: 1000 }],
    };
    setSource(world, 3, source(100));
    setProducer(world, 4, producer(recipe));
    for (let tick = 0; tick < 3; tick += 1) {
      runPhases(world, registry, [7, 11, 12, 13], input);
    }
    expect(stock(world, 2, 1)).toBe(200);
  });

  it('[GDD-6.2] an inactive location blocks the producer', () => {
    const world = makeWorld();
    const location = locationOf(world, entityId(1));
    if (location !== undefined) {
      stores(world)
        .get<Location>('location')
        .set(entityId(1), { ...location, active: false });
    }
    setProducer(world, 4, producer(batchRecipe));
    runPhases(world, registry, [7], input);
    expect(producerOf(world, 4)?.blockReasons).toContain('location_inactive');
  });
});
