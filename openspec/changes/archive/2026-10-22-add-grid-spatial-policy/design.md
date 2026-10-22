# Design — add-grid-spatial-policy

## Context

`add-abstract-capacity-locations` (1.8) is archived: the `SpatialPolicy` interface and registry, the `abstract_capacity` policy, the `Location`/`LocationHub` components, and `instantiateWorld`/`defaultWorldPlan` exist. TDS-8.4 declares that spatial indexes are derived caches in `world.caches`, rebuilt in phase 04. The `transform`, `footprint`, and `location` store kinds already exist in the catalogue (TDS-8.3) but are empty. Phase 04 is a registered no-op. This document records the grid-policy semantics, the grid runtime shapes, and the cache contract that 3.1 fixes.

## Goals / Non-Goals

**Goals:** the `framework.spatial.grid` policy, grid location geometry with a fixed or seeded buildable mask, the `transform`/`footprint` components, the derived occupancy cache (INV-20), distance and radius coverage queries, and grid mapping in the default world plan and instantiation.

**Non-Goals:** construction lifecycle and cost reservation (3.2), placement predicates, `placement_query`, and placement commands (3.3), connectivity providers (3.4), slot and area sources (3.5), the reference builder content (3.6), the client grid (3.7).

## Decisions

### D1 — Module layout

- `packages/core/src/sim/spatial.ts`: grid geometry, transform, footprint, orientation, distance-metric types; the occupancy-cache types and the pure build/maintain/query helpers; the seeded buildable-mask generator.
- `packages/core/src/policies/spatial/types.ts`: the `SpatialPolicy` interface (unchanged) plus the `GridSpatialPolicy` interface and the `GridPlacementResult` union.
- `packages/core/src/policies/spatial/grid.ts`: `GRID_POLICY_ID`, `gridPolicy`, and `resolveGridSpatialPolicy`.
- `packages/core/src/policies/spatial/registry.ts`: the policy map and `resolveSpatialPolicy`, which now resolves both policies. `abstract-capacity.ts` keeps only the abstract policy.
- `packages/core/src/systems/phase-04-rebuild-spatial-caches.ts`: implements `rebuildSpatialCaches`.
- `packages/core/src/sim/instantiate.ts` and `packages/content/src/world/plan.ts`: grid plan fields and resolution.

### D2 — Policy interface and registration

The existing `SpatialPolicy` (ARCH-11, 1.8) is unchanged so the abstract-capacity behavior and the existing goldens do not move:

```ts
interface SpatialPolicy {
  readonly id: string;
  capacity(world: World, location: EntityId): CapacitySummary;
  validatePlacement(world: World, location: EntityId, footprint: Int): PlacementResult;
  add(world: World, location: EntityId, footprint: Int): void;
  remove(world: World, location: EntityId, footprint: Int): void;
}
```

The grid policy implements it and adds positional operations behind a narrower interface:

```ts
type GridPlacementResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly code:
      'unknown_location' | 'location_inactive' | 'out_of_bounds'
      | 'not_buildable' | 'occupied' | 'insufficient_capacity' };

interface GridSpatialPolicy extends SpatialPolicy {
  readonly id: 'framework.spatial.grid';
  buildable(world: World, location: EntityId, position: GridPosition): boolean;
  canPlace(world: World, location: EntityId, footprint: Footprint, transform: LogicalTransform): GridPlacementResult;
  place(world: World, entity: EntityId, footprint: Footprint, transform: LogicalTransform): GridPlacementResult;
  unplace(world: World, entity: EntityId): void;
  distance(world: World, a: EntityId, b: EntityId, metric: DistanceMetric): Int | null;
  covers(world: World, provider: EntityId, consumer: EntityId, radius: Int): boolean;
}
```

`resolveSpatialPolicy(id)` returns `SpatialPolicy | null` and resolves `framework.spatial.grid` to `gridPolicy` (a `GridSpatialPolicy` is a `SpatialPolicy`). Grid-specific callers import `gridPolicy` or use `resolveGridSpatialPolicy(id): GridSpatialPolicy | null`.

### D3 — Grid geometry on the location

A grid location carries its geometry as an optional field of the existing `location` component; abstract locations omit it, so their encoded form and every existing golden hash are unchanged. No new store kind is added (a new kind would add a key to `encodeStores` for every world and change every hash).

```ts
type LocationGrid = { readonly width: Int; readonly height: Int; readonly blocked: readonly Int[] }; // packed y*width+x, ascending
type Location = { /* existing fields */; readonly grid?: LocationGrid };
```

`blocked` is the fixed or seeded mask. `total` buildable cells = `width * height - blocked.length`; `instantiateWorld` sets `Location.capacity` to that count for a grid location, and the grid `capacity` computes it from the geometry (authoritative). `used` is the authoritative occupied-cell count; the positional cell→entity mapping is the derived cache of D5.

### D4 — Transform, footprint, and orientation

```ts
type Orientation = 0 | 1 | 2 | 3;               // quarter turns clockwise
type Footprint = { readonly width: Int; readonly height: Int };
type GridPosition = { readonly x: Int; readonly y: Int };
type LogicalTransform = { readonly location: EntityId | null; readonly position: GridPosition; readonly orientation: Orientation };
```

The occupied cells of an entity are the footprint rectangle rotated about its top-left anchor: orientations `0`/`2` occupy `width × height`; orientations `1`/`3` occupy `height × width`. Cells are enumerated row-major, so they are ascending by packed index. `canPlace` checks, in order, `unknown_location`, `location_inactive`, `out_of_bounds`, `not_buildable`, `occupied`, `insufficient_capacity`. `place` sets the `transform` and `footprint` components, adds the cell count to `Location.used`, and inserts the cells into the cache incrementally; `unplace` reverses all three.

### D5 — Occupancy cache (derived, INV-20)

```ts
type OccupiedCell = { readonly cell: Int; readonly entity: EntityId };
type LocationOccupancy = { readonly location: EntityId; readonly width: Int; readonly height: Int; readonly blocked: readonly Int[]; readonly occupied: readonly OccupiedCell[] };
type SpatialCache = { readonly locations: readonly LocationOccupancy[] };
```

`world.caches.spatial` holds the cache and is typed `SpatialCache | undefined`. `buildSpatialCache(world)` scans the `transform` store in ascending entity ID, pairs each entity with its `footprint`, groups cells by `transform.location`, and emits one `LocationOccupancy` per grid location in ascending location ID with `occupied` sorted by `(cell, entity)`. `addOccupancy`/`removeOccupancy` maintain one entity's cells incrementally. `rebuildSpatialCaches(world)` replaces the cache with a full build and clears `caches.dirty`.

Phase 04 runs `rebuildSpatialCaches` when `world.caches.dirty` is true. It reads `location`, `transform`, and `footprint` and writes no component store; `createWorld`, `decodeWorld`, and `cloneWorld` leave `dirty` true, so the first phase-04 run (and the run after every load or clone) rebuilds. `encodeWorld` never encodes `caches`, so the cache is excluded from saves and hashes. INV-20 holds because `place`/`unplace` insert and delete exactly the cells that a full rebuild recomputes; the property test and the `checkInvariants` INV-20 check both compare a full rebuild with the maintained cache.

### D6 — Distance and coverage

`distance(world, a, b, metric)` reads both anchors from the `transform` store and returns a safe integer, or `null` when either entity has no transform. `manhattan` is `|dx| + |dy|`; `chebyshev` is `max(|dx|, |dy|)`. `covers(world, provider, consumer, radius)` is true when `dx*dx + dy*dy <= radius*radius` (a circle in cells, the CONT-6.12 `radius` relation), and false when either entity has no transform or the radius is negative. The squared comparison keeps coverage free of floating point and of an integer square root.

### D7 — Default world plan and instantiation

`LocationPlan` gains an optional `grid` field:

```ts
type LocationGridPlan = {
  readonly width: Int;
  readonly height: Int;
  readonly blocked: readonly Int[] | null;                       // fixed mask
  readonly buildableRatio: { readonly min: Int; readonly max: Int } | null; // seeded
};
```

`defaultWorldPlan` branches on `spatial_policy`: an abstract-capacity template keeps the `total_capacity` path; a `framework.spatial.grid` template reads integer `width` and `height` (rejecting a missing or non-positive value with `unsupported_spatial_parameter`), and either an explicit `blocked_cells` list (fixed) or a `buildable_ratio` range (seeded). `instantiateWorld` resolves the mask: a fixed plan uses its `blocked` list; a seeded plan draws a ratio in `[min, max]` and a cell permutation from `createStream(world.rng.seed, 'spatial.buildable.<entity>')` via `nextInt`, then blocks `cellCount - floor(cellCount * ratio / 1000)` cells. Because the stream name is derived from the session seed and the deterministic location entity ID, the mask is reproducible and hash-stable, and the world seed's own streams are not consumed. This is the "seeded world generation" of TDS-15; the drawn mask is materialized on `Location.grid`, so it is authoritative and saved.

### D8 — Purity, encoding, and hashes

All new modules are pure: no clock, RNG stream consumption, global, or floating point. The seeded mask draws from an immutable `det` stream derived from the session seed. The new `Location.grid` field and the `transform`/`footprint` values are plain canonical data encoded by the generic store codec; no codec change is needed. The occupancy cache is not encoded. The abstract-capacity demo content and every existing golden are unaffected — no **HASH-CHANGING** artifact.

## Amendments and clarifications to 01–07

- **A-01 (clarification, 02 §3.4 Spatial):** add `GridGeometry` to the representative-component list, reading "the grid width, height, and buildable mask of a grid-policy location; the store mapping of TDS-8.3 carries it as an optional field of the `location` component rather than a new store kind, so the component catalogue is unchanged." GDD-6.1 already requires a location to declare its "capacity or topology"; this names the topology component.
- No other clarification or conflict was found.

## Risks / Trade-offs

- [Grid geometry on `location` rather than a new store] → avoids a hash-changing catalogue addition; recorded in A-01. A future row that needs many grid fields can promote it to its own store with a format bump.
- [`used` authoritative and the cell→entity map derived] → the two can diverge only if a caller uses the count API without placing entities; 3.3 owns the command path that keeps them together, and the INV-20 check covers the derived map.
- [Seeded masks draw outside `world.rng`] → the draw is a pure function of the session seed and entity ID, so determinism and hashing are unaffected; recorded in D7.

## Migration Plan

Additive modules and optional fields; phase 04 becomes active. No save-format, protocol, or golden artifact changes. Rollback reverts the change; the optional `grid` field and the cache are ignored by older code.

## Open Questions

None blocking.
