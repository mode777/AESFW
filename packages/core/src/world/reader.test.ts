import { describe, expect, it } from 'vitest';
import { createWorld } from './create.js';
import { readWorld } from './reader.js';
import { createEmptyRegistry } from '../registry/types.js';
import { definitionHandle, entityId, ownerHandle } from '../ids/index.js';
import type { Location, LocationHub } from '../sim/location.js';
import type { Inventory } from '../tx/inventory.js';
import type { Producer } from '../sim/production/types.js';

const registry = createEmptyRegistry();

const makeWorld = () => {
  const created = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  return created.value;
};

const producer = (): Producer => ({
  recipes: [],
  recipe: null,
  processSlots: 1,
  location: null,
  inputInventory: null,
  outputInventory: null,
  state: 'idle',
  blockReasons: [],
  progress: 0,
  inputReservations: [],
  capacityReservations: [],
});

describe('[TDS-10.2] WorldReader', () => {
  it('[TDS-10.2] reads locations and inventories and enumerates entities', () => {
    const world = makeWorld();
    const location = entityId(1);
    const inventory = entityId(2);
    const entity = entityId(3);
    world.stores.get<Location>('location').set(location, {
      template: definitionHandle(1),
      spatialPolicy: 'abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
    });
    world.stores.get<LocationHub>('locationHub').set(location, { inventories: [inventory] });
    world.stores.get<Inventory>('inventory').set(inventory, {
      owner: ownerHandle(0),
      policy: 'shared_location',
      revision: 0,
      entries: [],
      capacity: { total: 1000, perResource: null },
      acceptance: { accepts: [] },
    });
    world.stores.get<Producer>('producer').set(entity, producer());
    world.stores
      .get<{ definition: ReturnType<typeof definitionHandle> }>('definition')
      .set(entity, { definition: definitionHandle(9) });

    const reader = readWorld(world, registry);
    expect(reader.locationIds).toEqual([location]);
    expect(reader.entityIds).toEqual([entity]);
    expect(reader.location(location)?.template).toBe(definitionHandle(1));
    expect(reader.locationHub(location)?.inventories).toEqual([inventory]);
    expect(reader.inventory(inventory)?.owner).toBe(ownerHandle(0));
    expect(reader.definition(entity)).toBe(definitionHandle(9));
    expect(reader.knowledge(ownerHandle(0), location)).toBe('unknown');
  });
});
