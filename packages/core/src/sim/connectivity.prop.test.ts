import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle, stringId } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { stores } from '../testing.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import { buildConnectivityCache, rebuildConnectivityCaches } from './connectivity.js';
import type { Location, LocationHub } from './location.js';
import type { LogicalTransform } from './spatial.js';

const PR_BUDGET = { numRuns: 100 } as const;

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

const setLocation = (world: World, id: number, active: boolean): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.abstract_capacity',
      capacity: 100,
      used: 0,
      properties: [],
      region: null,
      active,
      owner: ownerHandle(0),
    });
};

const setHub = (world: World, id: number): void => {
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

const operation = fc.record({
  entity: fc.integer({ min: 2, max: 20 }),
  location: fc.constantFrom(1, 2),
  role: fc.constantFrom('provider' as const, 'requirement' as const),
  present: fc.boolean(),
});

describe('[INV-20][TDS-8.4] connectivity cache rebuild property', () => {
  it('[INV-20] a full rebuild equals the prior build', () => {
    fc.assert(
      fc.property(fc.array(operation, { maxLength: 40 }), (operations) => {
        const world = makeWorld();
        setLocation(world, 1, true);
        setHub(world, 1);
        setLocation(world, 2, false);
        for (const op of operations) {
          if (!op.present) {
            stores(world).get('connectivityNode').markRemoved(entityId(op.entity));
            continue;
          }
          stores(world)
            .get('connectivityNode')
            .set(entityId(op.entity), {
              role: op.role,
              network: stringId('test.connectivity.hub'),
            });
          placeAt(world, op.entity, op.location);
        }
        const first = buildConnectivityCache(world);
        world.caches.connectivity = { groups: [] };
        rebuildConnectivityCaches(world);
        return JSON.stringify(world.caches.connectivity) === JSON.stringify(first);
      }),
      PR_BUDGET,
    );
    expect(true).toBe(true);
  });
});
