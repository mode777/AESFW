import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { hashWorld } from '../world/codec.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import type { Inventory } from '../tx/inventory.js';
import { instantiateWorld } from './instantiate.js';
import type { WorldPlan } from './instantiate.js';
import { locationHubOf, locationOf } from './location.js';

const makeWorld = (): World => {
  const result = createWorld(createEmptyRegistry(), {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!result.ok) throw new Error('createWorld returned an error');
  return result.value;
};

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
    },
  ],
};

describe('[CONT-6.4][CONT-6.6][ARCH-3.1] default world instantiation', () => {
  it('[CONT-6.6] one location with one inventory is instantiated', () => {
    const world = makeWorld();
    instantiateWorld(world, plan);
    expect(locationOf(world, entityId(1))).toMatchObject({ capacity: 100, used: 0, active: true });
    expect(locationHubOf(world, entityId(1))).toEqual({ inventories: [2] });
    expect(world.stores.get<Inventory>('inventory').get(entityId(2))).toMatchObject({
      owner: 0,
      policy: 'framework.inventory.shared_location',
      entries: [],
    });
  });

  it('[ARCH-3.1] instantiation is deterministic', () => {
    const first = makeWorld();
    const second = makeWorld();
    instantiateWorld(first, plan);
    instantiateWorld(second, plan);
    expect(hashWorld(first, createEmptyRegistry())).toBe(hashWorld(second, createEmptyRegistry()));
  });

  it('[CONT-6.6] the owner is registered', () => {
    const world = makeWorld();
    instantiateWorld(world, plan);
    expect(world.owners.owners[ownerHandle(0)]?.handle).toBe(0);
  });

  it('[ARCH-3.1] identifiers advance monotonically', () => {
    const world = makeWorld();
    instantiateWorld(world, plan);
    expect(world.nextEntityId).toBe(3);
  });
});
