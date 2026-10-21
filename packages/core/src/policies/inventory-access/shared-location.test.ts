import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Inventory } from '../../tx/inventory.js';
import type { Location } from '../../sim/location.js';
import {
  SHARED_LOCATION_POLICY_ID,
  resolveInventoryAccessPolicy,
  sharedLocationPolicy,
} from './shared-location.js';

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

const makeInventory = (accepts: readonly number[]): Inventory => ({
  owner: ownerHandle(0),
  policy: SHARED_LOCATION_POLICY_ID,
  revision: 0,
  entries: [],
  capacity: { total: null, perResource: null },
  acceptance: { accepts: accepts.map(definitionHandle) },
});

const setLocation = (world: World, id: number, inventories: readonly number[]): void => {
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
  stores(world)
    .get('locationHub')
    .set(entityId(id), { inventories: inventories.map(entityId) });
};

describe('[ARCH-12][GDD-8.2] shared-location access', () => {
  it('[ARCH-12] a known policy resolves', () => {
    expect(resolveInventoryAccessPolicy(SHARED_LOCATION_POLICY_ID)).toBe(sharedLocationPolicy);
    expect(resolveInventoryAccessPolicy('framework.inventory.unknown')).toBeNull();
  });

  it('[ARCH-12] every accepting inventory of a location is accessible', () => {
    const world = makeWorld();
    setLocation(world, 1, [2, 3]);
    const store = stores(world).get<Inventory>('inventory');
    store.set(entityId(2), makeInventory([0]));
    store.set(entityId(3), makeInventory([1]));
    expect(
      sharedLocationPolicy.accessibleInventories(world, entityId(1), definitionHandle(0)),
    ).toEqual([2]);
  });

  it('[ARCH-12] an inventory with no acceptance accepts the resource', () => {
    const world = makeWorld();
    setLocation(world, 1, [2]);
    stores(world).get<Inventory>('inventory').set(entityId(2), makeInventory([]));
    expect(
      sharedLocationPolicy.accessibleInventories(world, entityId(1), definitionHandle(5)),
    ).toEqual([2]);
  });

  it('[ARCH-12] an unknown location has no accessible inventory', () => {
    const world = makeWorld();
    expect(
      sharedLocationPolicy.accessibleInventories(world, entityId(9), definitionHandle(0)),
    ).toEqual([]);
  });
});
