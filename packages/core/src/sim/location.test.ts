import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { stores } from '../testing.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import { locationHubOf, locationOf } from './location.js';
import type { Location } from './location.js';

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

describe('[GDD-6.1] location state', () => {
  it('[GDD-6.1] a location carries its declared fields', () => {
    const world = makeWorld();
    const location: Location = {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [{ property: stringId('test.property.a'), value: 1000 }],
      region: null,
      active: true,
      owner: ownerHandle(0),
    };
    stores(world).get<Location>('location').set(entityId(1), location);
    stores(world)
      .get('locationHub')
      .set(entityId(1), { inventories: [entityId(2)] });
    expect(locationOf(world, entityId(1))).toEqual(location);
    expect(locationHubOf(world, entityId(1))).toEqual({ inventories: [2] });
    expect(locationOf(world, entityId(9))).toBeUndefined();
  });
});
