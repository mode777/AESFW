/**
 * Spatial runtime state and queries (GDD-6.1, ARCH-11, TDS-8.4). Grid geometry,
 * logical transforms, footprints, orientation, the derived occupancy cache, the
 * seeded buildable-mask generator, and the distance and radius helpers. Every
 * value is a safe integer; the cache is derived and never authoritative.
 *
 * Source: GDD-6.1, ARCH-11, CONT-6.4, TDS-8.4
 */
import { createStream, nextInt } from '../det/index.js';
import type { Seed } from '../det/index.js';
import type { Int } from '../fx/index.js';
import type { EntityId } from '../ids/index.js';
import type { World } from '../world/types.js';
import type { Location } from './location.js';

/** A logical position in grid cells. */
export type GridPosition = { readonly x: Int; readonly y: Int };

/** A quarter-turn orientation, clockwise, in `0..3`. */
export type Orientation = 0 | 1 | 2 | 3;

/** A rectangular footprint in cells, before orientation. */
export type Footprint = { readonly width: Int; readonly height: Int };

/** A distance metric (ARCH-11). */
export type DistanceMetric = 'manhattan' | 'chebyshev';

/** A placed entity's logical transform (ARCH-3.4, TDS-8.3). */
export type LogicalTransform = {
  readonly location: EntityId | null;
  readonly position: GridPosition;
  readonly orientation: Orientation;
};

/** The grid geometry of a grid-policy location: dimensions and blocked cells
 * (packed `y * width + x`, ascending). */
export type LocationGrid = {
  readonly width: Int;
  readonly height: Int;
  readonly blocked: readonly Int[];
};

/** One occupied cell and the entity occupying it. */
export type OccupiedCell = { readonly cell: Int; readonly entity: EntityId };

/** The occupancy of one grid location, ordered by ascending cell then entity. */
export type LocationOccupancy = {
  readonly location: EntityId;
  readonly width: Int;
  readonly height: Int;
  readonly blocked: readonly Int[];
  readonly occupied: readonly OccupiedCell[];
};

/** The derived spatial cache (TDS-8.4), ordered by ascending location ID. */
export type SpatialCache = { readonly locations: readonly LocationOccupancy[] };

/** The transform of an entity, or `undefined`. */
export function transformOf(world: World, entity: EntityId): LogicalTransform | undefined {
  return world.stores.get<LogicalTransform>('transform').get(entity);
}

/** The footprint of an entity, or `undefined`. */
export function footprintOf(world: World, entity: EntityId): Footprint | undefined {
  return world.stores.get<Footprint>('footprint').get(entity);
}

/** The grid geometry of a location, or `undefined` for an abstract location. */
export function locationGridOf(world: World, location: EntityId): LocationGrid | undefined {
  return world.stores.get<Location>('location').get(location)?.grid;
}

/** Packs a position into a cell index for a grid of `width` cells per row. */
export function cellIndex(width: Int, position: GridPosition): Int {
  return position.y * width + position.x;
}

/** Unpacks a cell index into a position for a grid of `width` cells per row. */
export function cellPosition(width: Int, cell: Int): GridPosition {
  return { x: cell % width, y: Math.floor(cell / width) };
}

/** The number of buildable cells of a grid: inside the grid and not blocked. */
export function buildableCount(grid: LocationGrid): Int {
  return grid.width * grid.height - grid.blocked.length;
}

/** True when `cell` is inside the grid and not blocked. */
export function isBuildable(grid: LocationGrid, cell: Int): boolean {
  if (cell < 0 || cell >= grid.width * grid.height) return false;
  return !grid.blocked.includes(cell);
}

/**
 * The cells a footprint occupies at a transform, enumerated row-major
 * (ascending). Orientations `0`/`2` occupy `width × height`; `1`/`3` occupy
 * `height × width`.
 *
 * Source: GDD-6.1, ARCH-11
 */
export function footprintCells(footprint: Footprint, transform: LogicalTransform): GridPosition[] {
  const swapped = transform.orientation % 2 === 1;
  const width = swapped ? footprint.height : footprint.width;
  const height = swapped ? footprint.width : footprint.height;
  const cells: GridPosition[] = [];
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      cells.push({ x: transform.position.x + dx, y: transform.position.y + dy });
    }
  }
  return cells;
}

const compareCells = (a: OccupiedCell, b: OccupiedCell): number =>
  a.cell !== b.cell ? a.cell - b.cell : a.entity - b.entity;

/**
 * Rebuilds the occupancy cache from the authoritative transforms and
 * footprints (TDS-8.4). Entities are scanned in ascending entity ID; locations
 * are emitted in ascending location ID.
 *
 * Source: TDS-8.4, ARCH-11, INV-20
 */
export function buildSpatialCache(world: World): SpatialCache {
  const transformStore = world.stores.get<LogicalTransform>('transform');
  const footprintStore = world.stores.get<Footprint>('footprint');
  const occupiedByLocation = new Map<number, OccupiedCell[]>();
  for (const entity of transformStore.ids()) {
    const transform = transformStore.get(entity) as LogicalTransform | null | undefined;
    if (transform == null || transform.location === null) continue;
    const footprint = footprintStore.get(entity) as Footprint | null | undefined;
    if (footprint == null) continue;
    const grid = locationGridOf(world, transform.location);
    if (grid === undefined) continue;
    const list = occupiedByLocation.get(transform.location) ?? [];
    for (const position of footprintCells(footprint, transform)) {
      list.push({ cell: cellIndex(grid.width, position), entity });
    }
    occupiedByLocation.set(transform.location, list);
  }
  const locations: LocationOccupancy[] = [];
  for (const location of world.stores.get<Location>('location').ids()) {
    const grid = locationGridOf(world, location);
    if (grid === undefined) continue;
    const occupied = [...(occupiedByLocation.get(location) ?? [])].sort(compareCells);
    locations.push({
      location,
      width: grid.width,
      height: grid.height,
      blocked: [...grid.blocked],
      occupied,
    });
  }
  return { locations };
}

/**
 * Returns the spatial cache, rebuilding it lazily when absent or dirty
 * (TDS-8.4).
 *
 * Source: TDS-8.4
 */
export function ensureSpatialCache(world: World): SpatialCache {
  if (world.caches.spatial === undefined || world.caches.dirty) {
    world.caches.spatial = buildSpatialCache(world);
    world.caches.dirty = false;
  }
  return world.caches.spatial;
}

/**
 * Replaces the spatial cache with a full rebuild and clears `dirty`
 * (TDS-8.4, INV-20).
 *
 * Source: TDS-8.4, INV-20
 */
export function rebuildSpatialCaches(world: World): void {
  world.caches.spatial = buildSpatialCache(world);
  world.caches.dirty = false;
}

/**
 * Adds an entity's cells to the cache incrementally (TDS-8.4, INV-20). The
 * entity's `transform` and `footprint` components must already be set.
 *
 * Source: TDS-8.4, INV-20
 */
export function addOccupancy(world: World, entity: EntityId): void {
  const transform = transformOf(world, entity);
  const footprint = footprintOf(world, entity);
  if (transform === undefined || transform.location === null || footprint === undefined) return;
  const grid = locationGridOf(world, transform.location);
  if (grid === undefined) return;
  const cache = ensureSpatialCache(world);
  const locations = cache.locations.map((entry) => {
    if (entry.location !== transform.location) return entry;
    const occupied = [...entry.occupied];
    for (const position of footprintCells(footprint, transform)) {
      occupied.push({ cell: cellIndex(grid.width, position), entity });
    }
    occupied.sort(compareCells);
    return { ...entry, occupied };
  });
  world.caches.spatial = { locations };
}

/**
 * Removes an entity's cells from the cache incrementally (TDS-8.4, INV-20).
 *
 * Source: TDS-8.4, INV-20
 */
export function removeOccupancy(world: World, entity: EntityId): void {
  const transform = transformOf(world, entity);
  if (transform === undefined || transform.location === null) return;
  const cache = ensureSpatialCache(world);
  const locations = cache.locations.map((entry) =>
    entry.location === transform.location
      ? { ...entry, occupied: entry.occupied.filter((cell) => cell.entity !== entity) }
      : entry,
  );
  world.caches.spatial = { locations };
}

/**
 * Generates a buildable mask deterministically from the session seed and a
 * stream name (TDS-15, GDD-6.1). The ratio is permille buildable; the returned
 * blocked cells are packed indices in ascending order.
 *
 * Blocked cells form contiguous regions rather than an uncorrelated per-cell
 * coin flip: a coarse seeded value field is smoothed over 3×3 blocks and the
 * `blockedCount` highest-value cells are blocked, ties broken by the seeded
 * permutation. An uncorrelated mask makes multi-cell footprints effectively
 * unplaceable at the specified 40–70 % buildable range (a 4×4 needs `ratio^16`
 * of positions), which contradicts GDD 6.1's "configurable fraction of
 * non-buildable cells" as usable terrain. The ratio is honoured exactly.
 *
 * Source: TDS-15, GDD-6.1, CONT-6.4
 */
export function buildableMask(
  width: Int,
  height: Int,
  ratioPermille: Int,
  seed: Seed,
  name: string,
): Int[] {
  const cellCount = width * height;
  const buildable = Math.floor((cellCount * ratioPermille) / 1000);
  const blockedCount = cellCount - buildable;
  if (blockedCount <= 0) return [];
  if (blockedCount >= cellCount) {
    return Array.from({ length: cellCount }, (_, cell) => cell);
  }

  // Seeded permutation: the deterministic tie-breaker for equal field values.
  const cells: number[] = [];
  for (let cell = 0; cell < cellCount; cell += 1) cells.push(cell);
  let stream = createStream(seed, name);
  for (let index = cellCount - 1; index > 0; index -= 1) {
    const draw = nextInt(stream, index + 1);
    stream = draw.stream;
    const swap = cells[index];
    cells[index] = cells[draw.value] ?? 0;
    cells[draw.value] = swap ?? 0;
  }
  const rank = new Int32Array(cellCount);
  cells.forEach((cell, position) => {
    rank[cell] = position;
  });

  // Coarse value field: one draw per block, smoothed over the 3x3 block
  // neighbourhood so the blocked set grows as regions, not confetti.
  const blockSize = 5;
  const blocksX = Math.ceil(width / blockSize);
  const blocksY = Math.ceil(height / blockSize);
  const raw = new Int32Array(blocksX * blocksY);
  for (let by = 0; by < blocksY; by += 1) {
    for (let bx = 0; bx < blocksX; bx += 1) {
      const blockStream = createStream(seed, `${name}.field.${bx}.${by}`);
      raw[by * blocksX + bx] = nextInt(blockStream, 1000).value;
    }
  }
  const smoothed = new Int32Array(blocksX * blocksY);
  for (let by = 0; by < blocksY; by += 1) {
    for (let bx = 0; bx < blocksX; bx += 1) {
      let total = 0;
      let samples = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const x = bx + dx;
          const y = by + dy;
          if (x < 0 || y < 0 || x >= blocksX || y >= blocksY) continue;
          total += raw[y * blocksX + x] ?? 0;
          samples += 1;
        }
      }
      smoothed[by * blocksX + bx] = Math.floor(total / samples);
    }
  }

  const order: number[] = [];
  for (let cell = 0; cell < cellCount; cell += 1) order.push(cell);
  const cellValue = (cell: number): Int => {
    const x = cell % width;
    const y = Math.floor(cell / width);
    const bx = Math.floor(x / blockSize);
    const by = Math.floor(y / blockSize);
    return smoothed[by * blocksX + bx] ?? 0;
  };
  order.sort((a, b) => {
    const difference = cellValue(b) - cellValue(a);
    return difference === 0 ? (rank[a] ?? 0) - (rank[b] ?? 0) : difference;
  });
  return order.slice(0, blockedCount).sort((a, b) => a - b);
}

/**
 * The distance between two placed entities under a metric, or `null` when
 * either has no transform (ARCH-11).
 *
 * Source: GDD-3.6, ARCH-11
 */
export function distanceBetween(
  world: World,
  a: EntityId,
  b: EntityId,
  metric: DistanceMetric,
): Int | null {
  const transformA = transformOf(world, a);
  const transformB = transformOf(world, b);
  if (transformA === undefined || transformB === undefined) return null;
  const dx = Math.abs(transformA.position.x - transformB.position.x);
  const dy = Math.abs(transformA.position.y - transformB.position.y);
  return metric === 'manhattan' ? dx + dy : Math.max(dx, dy);
}

/**
 * True when the euclidean distance between two anchors is at most `radius`
 * (CONT-6.12). False when either entity has no transform or the radius is
 * negative.
 *
 * Source: GDD-3.6, CONT-6.12, ARCH-11
 */
export function withinRadius(
  world: World,
  provider: EntityId,
  consumer: EntityId,
  radius: Int,
): boolean {
  if (radius < 0) return false;
  const transformA = transformOf(world, provider);
  const transformB = transformOf(world, consumer);
  if (transformA === undefined || transformB === undefined) return false;
  const dx = transformA.position.x - transformB.position.x;
  const dy = transformA.position.y - transformB.position.y;
  return dx * dx + dy * dy <= radius * radius;
}
