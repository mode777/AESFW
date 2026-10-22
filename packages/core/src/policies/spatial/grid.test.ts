import { describe, expect, it } from 'vitest';
import { definitionHandle, entityId, ownerHandle } from '../../ids/index.js';
import { createEmptyRegistry } from '../../registry/types.js';
import { stores } from '../../testing.js';
import { createWorld } from '../../world/create.js';
import type { World } from '../../world/types.js';
import type { Location } from '../../sim/location.js';
import {
  buildSpatialCache,
  type Footprint,
  type LocationGrid,
  type LogicalTransform,
} from '../../sim/spatial.js';
import { GRID_POLICY_ID, gridPolicy, resolveGridSpatialPolicy } from './grid.js';
import { resolveSpatialPolicy } from './registry.js';

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

const setGrid = (world: World, id: number, grid: LocationGrid, used = 0, active = true): void => {
  stores(world)
    .get<Location>('location')
    .set(entityId(id), {
      template: definitionHandle(0),
      spatialPolicy: GRID_POLICY_ID,
      capacity: grid.width * grid.height - grid.blocked.length,
      used,
      properties: [],
      region: null,
      active,
      owner: ownerHandle(0),
      grid,
    });
};

const transform = (
  location: number | null,
  x: number,
  y: number,
  orientation: 0 | 1 | 2 | 3 = 0,
): LogicalTransform => ({
  location: location === null ? null : entityId(location),
  position: { x, y },
  orientation,
});

const footprint = (width: number, height: number): Footprint => ({ width, height });

const cellsOf = (world: World, location: number): number[] => {
  const entry = buildSpatialCache(world).locations.find(
    (item) => item.location === entityId(location),
  );
  return (entry?.occupied ?? []).map((cell) => cell.cell);
};

describe('[GDD-6.1][ARCH-11] grid spatial policy', () => {
  it('[ARCH-11] the grid policy resolves through the registry', () => {
    expect(resolveSpatialPolicy(GRID_POLICY_ID)).toBe(gridPolicy);
    expect(resolveGridSpatialPolicy(GRID_POLICY_ID)).toBe(gridPolicy);
    expect(resolveSpatialPolicy(GRID_POLICY_ID)?.id).toBe('framework.spatial.grid');
  });

  it('[GDD-6.1] grid capacity is reported from the buildable cells', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [0, 1, 4, 5] }, 3);
    expect(gridPolicy.capacity(world, entityId(1))).toEqual({ total: 12, used: 3, free: 9 });
  });

  it('[GDD-6.1] a count beyond capacity is rejected', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [0, 1, 4, 5] }, 3);
    expect(gridPolicy.validatePlacement(world, entityId(1), 10)).toEqual({
      ok: false,
      code: 'insufficient_capacity',
    });
  });

  it('[GDD-6.1] an unknown grid location is rejected', () => {
    const world = makeWorld();
    expect(gridPolicy.validatePlacement(world, entityId(9), 1)).toEqual({
      ok: false,
      code: 'unknown_location',
    });
  });

  it('[CONT-6.4] a fixed mask blocks its declared cells', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [0, 1, 4, 5] });
    expect(gridPolicy.buildable(world, entityId(1), { x: 0, y: 0 })).toBe(false);
    expect(gridPolicy.buildable(world, entityId(1), { x: 2, y: 2 })).toBe(true);
  });

  it('[CONT-6.4] a cell outside the grid is not buildable', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    expect(gridPolicy.canPlace(world, entityId(1), footprint(1, 1), transform(1, 4, 0))).toEqual({
      ok: false,
      code: 'out_of_bounds',
    });
  });

  it('[CONT-6.4] a blocked cell rejects placement', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [0] });
    expect(gridPolicy.canPlace(world, entityId(1), footprint(1, 1), transform(1, 0, 0))).toEqual({
      ok: false,
      code: 'not_buildable',
    });
  });

  it('[GDD-6.1] orientation rotates the footprint', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    expect(gridPolicy.place(world, entityId(5), footprint(2, 3), transform(1, 1, 1, 1))).toEqual({
      ok: true,
    });
    expect(cellsOf(world, 1)).toEqual([5, 6, 7, 9, 10, 11]);
    expect(gridPolicy.capacity(world, entityId(1)).used).toBe(6);
  });

  it('[GDD-6.1] an overlapping placement is rejected', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    gridPolicy.place(world, entityId(5), footprint(1, 1), transform(1, 1, 1));
    expect(gridPolicy.canPlace(world, entityId(1), footprint(1, 1), transform(1, 1, 1))).toEqual({
      ok: false,
      code: 'occupied',
    });
  });

  it('[GDD-6.1] a non-overlapping placement succeeds', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    gridPolicy.place(world, entityId(5), footprint(1, 1), transform(1, 1, 1));
    expect(gridPolicy.place(world, entityId(6), footprint(1, 1), transform(1, 3, 3))).toEqual({
      ok: true,
    });
    expect(gridPolicy.capacity(world, entityId(1)).used).toBe(2);
  });

  it('[GDD-6.1] unplacing frees the cells', () => {
    const world = makeWorld();
    setGrid(world, 1, { width: 4, height: 4, blocked: [] });
    gridPolicy.place(world, entityId(5), footprint(2, 2), transform(1, 1, 1));
    gridPolicy.unplace(world, entityId(5));
    expect(cellsOf(world, 1)).toEqual([]);
    expect(gridPolicy.capacity(world, entityId(1)).used).toBe(0);
  });

  it('[ARCH-11] manhattan distance', () => {
    const world = makeWorld();
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(5), transform(null, 0, 0));
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(6), transform(null, 3, 4));
    expect(gridPolicy.distance(world, entityId(5), entityId(6), 'manhattan')).toBe(7);
  });

  it('[ARCH-11] chebyshev distance', () => {
    const world = makeWorld();
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(5), transform(null, 0, 0));
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(6), transform(null, 3, 4));
    expect(gridPolicy.distance(world, entityId(5), entityId(6), 'chebyshev')).toBe(4);
  });

  it('[ARCH-11] distance to an unplaced entity is null', () => {
    const world = makeWorld();
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(5), transform(null, 0, 0));
    expect(gridPolicy.distance(world, entityId(5), entityId(9), 'manhattan')).toBeNull();
  });

  it('[CONT-6.12] euclidean coverage within radius', () => {
    const world = makeWorld();
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(5), transform(null, 0, 0));
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(6), transform(null, 3, 4));
    expect(gridPolicy.covers(world, entityId(5), entityId(6), 5)).toBe(true);
  });

  it('[CONT-6.12] euclidean coverage beyond radius', () => {
    const world = makeWorld();
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(5), transform(null, 0, 0));
    stores(world)
      .get<LogicalTransform>('transform')
      .set(entityId(6), transform(null, 3, 4));
    expect(gridPolicy.covers(world, entityId(5), entityId(6), 4)).toBe(false);
  });
});
