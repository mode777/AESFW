import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../../ids/index.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Location, LocationHub } from '../location.js';
import type { LogicalTransform } from '../spatial.js';
import { staticBlockReasons } from './preconditions.js';
import type { Producer, RecipeSpec } from './types.js';

const res = (value: number) => definitionHandle(value);

const recipe: RecipeSpec = {
  recipe: res(0),
  mode: 'batch',
  duration: 10,
  inputs: [],
  outputs: [],
  capabilities: [],
  condition: null,
};

const producer = (overrides: Partial<Producer> = {}): Producer => ({
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

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), {
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
  return world;
};

const setLocation = (world: World, id: number): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
    });
  stores(world).get<LocationHub>('locationHub').set(entityId(id), { inventories: [] });
};

const placeAt = (world: World, entity: number, location: number): void => {
  const transform: LogicalTransform = {
    location: entityId(location),
    position: { x: 0, y: 0 },
    orientation: 0,
  };
  stores(world).get<LogicalTransform>('transform').set(entityId(entity), transform);
};

const setNode = (world: World, entity: number, role: 'provider' | 'requirement'): void => {
  stores(world)
    .get('connectivityNode')
    .set(entityId(entity), { role, network: stringId('test.connectivity.hub') });
};

describe('[GDD-10.3] production preconditions', () => {
  it('[GDD-10.3] a disabled producer reports entity_disabled', () => {
    const world = makeWorld();
    stores(world).get('enabled').set(entityId(4), { enabled: false });
    expect(staticBlockReasons(world, entityId(4), producer())).toContain('entity_disabled');
  });

  it('[GDD-10.3] a recipe with a condition reports condition_false', () => {
    const world = makeWorld();
    const conditioned = producer({ recipes: [{ ...recipe, condition: res(9) }] });
    expect(staticBlockReasons(world, entityId(4), conditioned)).toContain('condition_false');
  });

  it('[GDD-10.3] a producer without inventories reports missing_inventory_access', () => {
    const world = makeWorld();
    expect(staticBlockReasons(world, entityId(4), producer({ inputInventory: null }))).toContain(
      'missing_inventory_access',
    );
  });

  it('[GDD-10.3] a deficit-paused producer reports paused_by_deficit', () => {
    const world = makeWorld();
    world.owners = {
      owners: [
        {
          handle: ownerHandle(0),
          knowledge: [],
          accounts: [],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [entityId(4)],
        },
      ],
    };
    expect(staticBlockReasons(world, entityId(4), producer())).toContain('paused_by_deficit');
  });

  it('[GDD-10.2] a disconnected requiring producer reports missing_inventory_access', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setNode(world, 4, 'requirement');
    placeAt(world, 4, 1);
    expect(staticBlockReasons(world, entityId(4), producer())).toContain(
      'missing_inventory_access',
    );
  });

  it('[GDD-10.2] a connected requiring producer has inventory access', () => {
    const world = makeWorld();
    setLocation(world, 1);
    setNode(world, 3, 'provider');
    placeAt(world, 3, 1);
    setNode(world, 4, 'requirement');
    placeAt(world, 4, 1);
    expect(staticBlockReasons(world, entityId(4), producer())).not.toContain(
      'missing_inventory_access',
    );
  });

  it('[GDD-10.3] a disabled disconnected requiring producer reports both reasons in order', () => {
    const world = makeWorld();
    stores(world).get('enabled').set(entityId(4), { enabled: false });
    setLocation(world, 1);
    setNode(world, 4, 'requirement');
    placeAt(world, 4, 1);
    expect(staticBlockReasons(world, entityId(4), producer())).toEqual([
      'entity_disabled',
      'missing_inventory_access',
    ]);
  });
});
