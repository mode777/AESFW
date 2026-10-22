# Proposal

## Why

Roadmap 08, M3 item 3.1 (`add-grid-spatial-policy`, capability `sim/spatial`, size L). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). The abstract-capacity policy of 1.8 proves the spatial-policy interface, but the reference game is built on a grid: locations have finite buildable cells, buildings occupy footprints in one of four orientations, and needs can be satisfied by geometry (coverage) instead of flow (GDD-3.6, GDD-6.1). Until the framework can place entities on a grid, validate a footprint against a buildable mask, and answer distance and coverage queries, no construction or area-source row can be built. This row delivers the `framework.spatial.grid` policy, grid location geometry with a fixed or seeded buildable mask, footprints and orientation, the occupancy cache as a derived cache rebuilt in phase 04, and distance and radius queries. Depends on: `add-abstract-capacity-locations` (1.8) — archived 2026-10-21.

## What Changes

- Add the `framework.spatial.grid` spatial policy behind the existing `SpatialPolicy` interface (ARCH-11, TDS-13), registered in the spatial-policy registry.
- Add grid geometry to a location: width, height, and a buildable mask that is either fixed (an explicit non-buildable cell set) or seeded (generated deterministically from the world seed and the location entity ID).
- Add the `transform` and `footprint` runtime components: a logical position, a quarter-turn orientation, and a rectangular footprint. The occupied cell set is the footprint rectangle rotated by the orientation.
- Add positional placement validation for the grid policy: reject `unknown_location`, `location_inactive`, `out_of_bounds`, `not_buildable`, `occupied`, and `insufficient_capacity`.
- Add the occupancy cache as a derived cache in `world.caches.spatial`: excluded from saves and hashes, rebuilt in phase 04 from the authoritative transforms and footprints, and maintained incrementally by placements. INV-20 holds: a full rebuild equals incremental maintenance.
- Add distance (manhattan, chebyshev, euclidean) and radius coverage queries to the grid policy.
- Extend `defaultWorldPlan` and `instantiateWorld` so a grid location template becomes a grid location plan with its width, height, and fixed or seeded mask.
- No **BREAKING** changes and no **HASH-CHANGING** artifacts: the occupancy cache is excluded from `encodeWorld`, and the abstract-capacity `Location` shape used by the existing goldens is unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sim/spatial`: adds the grid policy, location grid geometry and buildable mask, footprints and orientation, the derived occupancy cache (INV-20), and distance and radius queries.
- `content/registry`: extends the default world plan to carry grid spatial parameters (width, height, fixed or seeded buildable mask) for grid location templates.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/spatial.ts`, extends `src/policies/spatial/**`, `src/sim/instantiate.ts`, `src/world/types.ts`, and implements `src/systems/phase-04-rebuild-spatial-caches.ts`; `@aesfw/content` extends `src/world/plan.ts`. No new runtime dependency is added to `@aesfw/core`.
- **Tick phases:** phase 04 `rebuildSpatialCaches` becomes active (reads `location`, `transform`, `footprint`; writes no component store). **Store kinds:** `location` (gains an optional grid field), `transform`, `footprint`. **Derived cache:** `world.caches.spatial`.
- **Commands/events:** none. **Diagnostic codes:** reuses `unsupported_spatial_parameter` for a grid template missing its dimensions; no new code.
- **Verification impact:** new L1 unit tests for the grid policy, geometry, cache, phase 04, instantiation, and content mapping; an INV-20 property test comparing a full rebuild with incremental maintenance; `checkInvariants` gains an INV-20 check.
- **Out of scope (later roadmap rows):** construction lifecycle (3.2 `add-construction-lifecycle`), generic placement predicates and commands (3.3 `add-placement-predicates-and-commands`), connectivity (3.4 `add-connectivity-requirement`), slot and area sources (3.5 `add-slot-and-area-sources`), the reference builder stage (3.6), and the client grid (3.7).
