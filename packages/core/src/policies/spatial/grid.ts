/**
 * The `framework.spatial.grid` spatial policy (GDD-6.1, ARCH-11). A location is
 * a grid of buildable cells; occupancy is derived from the transforms and
 * footprints of placed entities and held in the derived spatial cache.
 *
 * Source: GDD-6.1, ARCH-11, CONT-6.4, TDS-8.4
 */
import type { Int } from '../../fx/index.js';
import type { EntityId } from '../../ids/index.js';
import { locationOf } from '../../sim/location.js';
import type { Location } from '../../sim/location.js';
import {
  addOccupancy,
  buildableCount,
  cellIndex,
  distanceBetween,
  ensureSpatialCache,
  footprintCells,
  footprintOf,
  isBuildable,
  locationGridOf,
  removeOccupancy,
  transformOf,
  withinRadius,
} from '../../sim/spatial.js';
import type {
  DistanceMetric,
  Footprint,
  GridPosition,
  LogicalTransform,
} from '../../sim/spatial.js';
import type { World } from '../../world/types.js';
import type {
  CapacitySummary,
  GridPlacementResult,
  GridSpatialPolicy,
  PlacementResult,
} from './types.js';

/** The string id of the grid policy. */
export const GRID_POLICY_ID = 'framework.spatial.grid';

const totalOf = (world: World, location: EntityId): Int => {
  const grid = locationGridOf(world, location);
  if (grid !== undefined) return buildableCount(grid);
  return locationOf(world, location)?.capacity ?? 0;
};

const setUsed = (world: World, location: EntityId, used: Int): void => {
  const store = world.stores.get<Location>('location');
  const component = store.get(location);
  if (component === undefined) return;
  store.set(location, { ...component, used });
};

const capacity = (world: World, location: EntityId): CapacitySummary => {
  const component = locationOf(world, location);
  if (component === undefined) return { total: 0, used: 0, free: 0 };
  const total = totalOf(world, location);
  const free = total - component.used;
  return { total, used: component.used, free: free < 0 ? 0 : free };
};

const validatePlacement = (world: World, location: EntityId, footprint: Int): PlacementResult => {
  const component = locationOf(world, location);
  if (component === undefined) return { ok: false, code: 'unknown_location' };
  if (!component.active) return { ok: false, code: 'location_inactive' };
  if (component.used + footprint > totalOf(world, location)) {
    return { ok: false, code: 'insufficient_capacity' };
  }
  return { ok: true };
};

const add = (world: World, location: EntityId, footprint: Int): void => {
  const component = locationOf(world, location);
  if (component === undefined) return;
  setUsed(world, location, component.used + footprint);
};

const remove = (world: World, location: EntityId, footprint: Int): void => {
  const component = locationOf(world, location);
  if (component === undefined) return;
  const next = component.used - footprint;
  setUsed(world, location, next < 0 ? 0 : next);
};

const buildable = (world: World, location: EntityId, position: GridPosition): boolean => {
  const grid = locationGridOf(world, location);
  if (grid === undefined) return false;
  return isBuildable(grid, cellIndex(grid.width, position));
};

const occupiedCells = (world: World, location: EntityId): Set<Int> => {
  const cache = ensureSpatialCache(world);
  const entry = cache.locations.find((item) => item.location === location);
  const cells = new Set<Int>();
  for (const cell of entry?.occupied ?? []) cells.add(cell.cell);
  return cells;
};

const canPlace = (
  world: World,
  location: EntityId,
  footprint: Footprint,
  transform: LogicalTransform,
): GridPlacementResult => {
  const component = locationOf(world, location);
  if (component === undefined) return { ok: false, code: 'unknown_location' };
  if (!component.active) return { ok: false, code: 'location_inactive' };
  const grid = locationGridOf(world, location);
  if (grid === undefined) return { ok: false, code: 'unknown_location' };
  const positions = footprintCells(footprint, transform);
  for (const position of positions) {
    if (position.x < 0 || position.y < 0 || position.x >= grid.width || position.y >= grid.height) {
      return { ok: false, code: 'out_of_bounds' };
    }
  }
  for (const position of positions) {
    if (!isBuildable(grid, cellIndex(grid.width, position))) {
      return { ok: false, code: 'not_buildable' };
    }
  }
  const occupied = occupiedCells(world, location);
  for (const position of positions) {
    if (occupied.has(cellIndex(grid.width, position))) {
      return { ok: false, code: 'occupied' };
    }
  }
  if (component.used + positions.length > buildableCount(grid)) {
    return { ok: false, code: 'insufficient_capacity' };
  }
  return { ok: true };
};

const place = (
  world: World,
  entity: EntityId,
  footprint: Footprint,
  transform: LogicalTransform,
): GridPlacementResult => {
  if (transform.location === null) return { ok: false, code: 'unknown_location' };
  const location = transform.location;
  if (transformOf(world, entity) !== undefined) unplace(world, entity);
  const result = canPlace(world, location, footprint, transform);
  if (!result.ok) return result;
  world.stores.get<LogicalTransform>('transform').set(entity, transform);
  world.stores.get<Footprint>('footprint').set(entity, footprint);
  const component = locationOf(world, location);
  if (component !== undefined) {
    setUsed(world, location, component.used + footprintCells(footprint, transform).length);
  }
  addOccupancy(world, entity);
  return { ok: true };
};

const unplace = (world: World, entity: EntityId): void => {
  const transform = transformOf(world, entity);
  const footprint = footprintOf(world, entity);
  if (transform === undefined || transform.location === null || footprint === undefined) return;
  removeOccupancy(world, entity);
  const component = locationOf(world, transform.location);
  if (component !== undefined) {
    const next = component.used - footprintCells(footprint, transform).length;
    setUsed(world, transform.location, next < 0 ? 0 : next);
  }
  world.stores.get<LogicalTransform>('transform').markRemoved(entity);
  world.stores.get<Footprint>('footprint').markRemoved(entity);
};

const distance = (world: World, a: EntityId, b: EntityId, metric: DistanceMetric): Int | null =>
  distanceBetween(world, a, b, metric);

const covers = (world: World, provider: EntityId, consumer: EntityId, radius: Int): boolean =>
  withinRadius(world, provider, consumer, radius);

/** The grid spatial policy. */
export const gridPolicy: GridSpatialPolicy = {
  id: GRID_POLICY_ID,
  capacity,
  validatePlacement,
  add,
  remove,
  buildable,
  canPlace,
  place,
  unplace,
  distance,
  covers,
};

/** Resolves the grid policy by id, or `null` when the id is not the grid policy. */
export function resolveGridSpatialPolicy(id: string): GridSpatialPolicy | null {
  return id === GRID_POLICY_ID ? gridPolicy : null;
}
