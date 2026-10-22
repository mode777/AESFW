import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { stores } from '../testing.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import type { Location } from './location.js';
import { gridPolicy } from '../policies/spatial/grid.js';
import { ensureSpatialCache, rebuildSpatialCaches } from './spatial.js';

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

const setGrid = (world: World): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(1), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.grid',
      capacity: 16,
      used: 0,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
      grid: { width: 4, height: 4, blocked: [0, 5] },
    });
};

const operation = fc.record({
  entity: fc.integer({ min: 2, max: 12 }),
  x: fc.integer({ min: 0, max: 3 }),
  y: fc.integer({ min: 0, max: 3 }),
  width: fc.integer({ min: 1, max: 2 }),
  height: fc.integer({ min: 1, max: 2 }),
  orientation: fc.constantFrom(0 as const, 1 as const, 2 as const, 3 as const),
  place: fc.boolean(),
});

describe('[INV-20][TDS-8.4] spatial cache rebuild property', () => {
  it('[INV-20] incremental maintenance equals a full rebuild', () => {
    fc.assert(
      fc.property(fc.array(operation, { maxLength: 30 }), (operations) => {
        const world = makeWorld();
        setGrid(world);
        ensureSpatialCache(world);
        for (const op of operations) {
          if (op.place) {
            gridPolicy.place(
              world,
              entityId(op.entity),
              { width: op.width, height: op.height },
              {
                location: entityId(1),
                position: { x: op.x, y: op.y },
                orientation: op.orientation,
              },
            );
          } else {
            gridPolicy.unplace(world, entityId(op.entity));
          }
        }
        const maintained = JSON.stringify(world.caches.spatial);
        rebuildSpatialCaches(world);
        return JSON.stringify(world.caches.spatial) === maintained;
      }),
      PR_BUDGET,
    );
    expect(true).toBe(true);
  });
});
