import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../ids/index.js';
import { createEmptyRegistry } from '../registry/types.js';
import { runPhases, stores } from '../testing.js';
import { cloneWorld, hashWorld } from '../world/codec.js';
import { createWorld } from '../world/create.js';
import type { World } from '../world/types.js';
import type { Location } from './location.js';
import {
  addOccupancy,
  buildSpatialCache,
  buildableMask,
  ensureSpatialCache,
  rebuildSpatialCaches,
  type Footprint,
  type LocationGrid,
  type LogicalTransform,
  type SpatialCache,
} from './spatial.js';

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

const setGrid = (world: World, id: number, grid: LocationGrid): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: 'framework.spatial.grid',
      capacity: grid.width * grid.height - grid.blocked.length,
      used: 1,
      properties: [],
      region: null,
      active: true,
      owner: ownerHandle(0),
      grid,
    });
};

const place = (world: World, entity: number, location: number, footprint: Footprint): void => {
  const transform: LogicalTransform = {
    location: entityId(location),
    position: { x: 0, y: 0 },
    orientation: 0,
  };
  stores(world).get<LogicalTransform>('transform').set(entityId(entity), transform);
  stores(world).get<Footprint>('footprint').set(entityId(entity), footprint);
};

const emptyInput = { commands: [], options: { journal: false, hash: false } };

describe('[TDS-8.4][INV-20] spatial cache', () => {
  it('[TDS-8.4] a full build lists the occupied cells', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    place(world, 5, 1, { width: 1, height: 1 });
    expect(buildSpatialCache(world)).toEqual({
      locations: [
        {
          location: 1,
          width: 4,
          height: 4,
          blocked: [],
          occupied: [{ cell: 0, entity: 5 }],
        },
      ],
    });
  });

  it('[TDS-8.4] phase 04 rebuilds a dirty cache', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    place(world, 5, 1, { width: 1, height: 1 });
    world.caches.spatial = undefined;
    world.caches.dirty = true;
    runPhases(world, createEmptyRegistry(), [4], emptyInput);
    expect(world.caches.dirty).toBe(false);
    const cache = world.caches.spatial as SpatialCache | undefined;
    expect(cache?.locations[0]?.occupied).toEqual([{ cell: 0, entity: 5 }]);
  });

  it('[TDS-8.4] the cache is excluded from the hash', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    const before = hashWorld(world, createEmptyRegistry());
    world.caches.spatial = {
      locations: [{ location: entityId(1), width: 4, height: 4, blocked: [], occupied: [] }],
    };
    expect(hashWorld(world, createEmptyRegistry())).toBe(before);
  });

  it('[TDS-8.4] a clone leaves the cache dirty', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    ensureSpatialCache(world);
    const clone = cloneWorld(world);
    expect(clone.caches.dirty).toBe(true);
    expect(clone.caches.spatial).toBeUndefined();
  });

  it('[INV-20] a full rebuild equals incremental maintenance', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    ensureSpatialCache(world);
    place(world, 5, 1, { width: 1, height: 1 });
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(5), {
        location: entityId(1),
        position: { x: 1, y: 2 },
        orientation: 0,
      });
    addOccupancy(world, entityId(5));
    const maintained = JSON.stringify(world.caches.spatial);
    rebuildSpatialCaches(world);
    expect(JSON.stringify(world.caches.spatial)).toBe(maintained);
  });

  it('[TDS-15] a seeded mask is deterministic and sized by the ratio', () => {
    const first = buildableMask(4, 4, 500, [1, 2], 'spatial.buildable.1');
    const second = buildableMask(4, 4, 500, [1, 2], 'spatial.buildable.1');
    expect(first).toEqual(second);
    expect(first).toHaveLength(8);
    expect([...first].sort((a, b) => a - b)).toEqual(first);
    expect(first.every((cell) => cell >= 0 && cell < 16)).toBe(true);
  });

  it('[GDD-6.1] the ratio bounds hold at the extremes', () => {
    expect(buildableMask(8, 8, 1000, [1, 2], 'spatial.buildable.a')).toEqual([]);
    expect(buildableMask(8, 8, 0, [1, 2], 'spatial.buildable.a')).toHaveLength(64);
    expect(buildableMask(10, 10, 500, [1, 2], 'spatial.buildable.a')).toHaveLength(50);
    expect(buildableMask(10, 10, 400, [1, 2], 'spatial.buildable.a')).toHaveLength(60);
  });

  it('[GDD-6.1] blocked cells form regions, not an uncorrelated per-cell mask', () => {
    // GDD 6.1 asks for buildable terrain, not white noise: a 40x40 grid at the
    // reference range must keep room for the archetype footprints (3x3 to 4x4)
    // on every probed seed. An independent per-cell mask fails this for most
    // seeds (the chance of a free 4x4 is ratio^16).
    const largestFreeSquare = (blocked: readonly number[], size: number): number => {
      const set = new Set(blocked);
      for (let square = size; square >= 1; square -= 1) {
        for (let y = 0; y <= size - square; y += 1) {
          for (let x = 0; x <= size - square; x += 1) {
            let free = true;
            for (let dy = 0; dy < square && free; dy += 1) {
              for (let dx = 0; dx < square && free; dx += 1) {
                if (set.has((y + dy) * size + (x + dx))) free = false;
              }
            }
            if (free) return square;
          }
        }
      }
      return 0;
    };
    for (let seedIndex = 0; seedIndex < 16; seedIndex += 1) {
      for (const ratio of [400, 550, 700]) {
        const blocked = buildableMask(
          40,
          40,
          ratio,
          [seedIndex, seedIndex * 7],
          'spatial.buildable.x',
        );
        expect(largestFreeSquare(blocked, 40)).toBeGreaterThanOrEqual(5);
      }
    }
  });
});
