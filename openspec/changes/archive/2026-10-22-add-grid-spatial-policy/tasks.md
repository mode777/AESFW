# Tasks

## 1. Spatial types and policy interface (design D2, D3, D4)

- [x] 1.1 Create `packages/core/src/sim/spatial.ts` with `GridPosition`, `Orientation`, `Footprint`, `DistanceMetric`, `LogicalTransform`, `LocationGrid`, and the `OccupiedCell`/`LocationOccupancy`/`SpatialCache` cache types.
- [x] 1.2 Extend `packages/core/src/policies/spatial/types.ts` with `GridPlacementResult` and the `GridSpatialPolicy` interface (extending `SpatialPolicy`).
- [x] 1.3 Add the optional `grid` field to the `Location` component in `packages/core/src/sim/location.ts` and the `locationGridOf` helper.
- [x] 1.4 Type `world.caches.spatial` as `SpatialCache | undefined` in `packages/core/src/world/types.ts`.

## 2. Spatial helpers and cache (design D4, D5, D6)

- [x] 2.1 Add `cellIndex`, `cellPosition`, `isBuildable`, and `footprintCells` to `sim/spatial.ts` (row-major, ascending, orientation-aware).
- [x] 2.2 Add `buildSpatialCache`, `rebuildSpatialCaches`, `ensureSpatialCache`, `addOccupancy`, and `removeOccupancy`.
- [x] 2.3 Add `buildableMask(width, height, ratioPermille, seed, name)` using a `det` stream and `nextInt`.
- [x] 2.4 Add `distanceBetween` and `withinRadius` (euclidean squared comparison).

## 3. Grid policy (design D2)

- [x] 3.1 Create `packages/core/src/policies/spatial/grid.ts` with `GRID_POLICY_ID`, `gridPolicy` (base capacity/validatePlacement/add/remove plus `buildable`, `canPlace`, `place`, `unplace`, `distance`, `covers`), and `resolveGridSpatialPolicy`.
- [x] 3.2 Create `packages/core/src/policies/spatial/registry.ts` holding the policy map and `resolveSpatialPolicy`; remove the resolver from `abstract-capacity.ts` and update the abstract-capacity test import.
- [x] 3.3 Export the new types, `gridPolicy`, and helpers from `packages/core/src/policies/spatial/index.ts` and `packages/core/src/index.ts`.

## 4. Phase 04 and instantiation (design D5, D7)

- [x] 4.1 Implement `phase04RebuildSpatialCaches` to rebuild a dirty cache (reads `location`, `transform`, `footprint`; writes no store).
- [x] 4.2 Add `LocationGridPlan` and the optional `grid` field to `LocationPlan` in `packages/core/src/sim/instantiate.ts`; resolve fixed and seeded masks and set `Location.grid` and `capacity`.
- [x] 4.3 Extend `packages/content/src/world/plan.ts` to map a `framework.spatial.grid` template (width, height, fixed `blocked_cells`, or seeded `buildable_ratio`), reporting `unsupported_spatial_parameter` for missing or invalid dimensions.

## 5. Unit tests

- [x] 5.1 Add `packages/core/src/policies/spatial/grid.test.ts` covering the grid-policy registry, capacity, count placement, geometry/mask, footprint/orientation, overlap, and distance/coverage scenarios. [GDD-6.1, ARCH-11, CONT-6.4, CONT-6.12]
- [x] 5.2 Add `packages/core/src/sim/spatial.test.ts` covering the occupancy cache, phase-04 rebuild, hash exclusion, clone-dirty behavior, and mask determinism scenarios. [TDS-8.4, INV-20]
- [x] 5.3 Add `packages/core/src/sim/instantiate.test.ts` cases for a fixed grid plan and a seeded grid plan. [CONT-6.4, CONT-6.6]
- [x] 5.4 Add `packages/content/src/world/plan.test.ts` cases for grid spatial parameters. [CONT-6.4]

## 6. Invariants and property tests

- [x] 6.1 Add an INV-20 check to `packages/testkit/src/harness/invariants.ts`: when the spatial cache is present and clean, a full rebuild equals the maintained cache. [INV-20, TDS-8.4]
- [x] 6.2 Add an INV-20 property test in `packages/core/src/sim/spatial.prop.test.ts`: a random sequence of placements and removals maintained incrementally equals a full rebuild. [INV-20, TDS-8.4]

## 7. Documentation and verification

- [x] 7.1 Apply amendment A-01 to `docs/02_Simulation_Architecture.md` §3.4 (add `GridGeometry` to the Spatial component list).
- [x] 7.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 7.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [GDD-6.1, ARCH-11, CONT-6.4, TDS-8.4, INV-20]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.1 with "✓ archived <date>" in `docs/08`.
