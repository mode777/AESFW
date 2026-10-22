# Proposal

## Why

Roadmap 08, M3 item 3.6b (`add-spatial-projection-data`, capability `app/projections`, size M). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Rows 3.1 (`add-grid-spatial-policy`, archived 2026-10-22) added grid geometry, logical transforms, footprints, orientation, and the occupancy cache to the kernel; 3.3 (`add-placement-predicates-and-commands`, archived 2026-10-22) added placement; and 3.4 (`add-connectivity-requirement`, archived 2026-10-22) added the connectivity provider/requirement component and binary hub access. The M3 client row 3.7 (`add-client-location-grid`) must render the grid, shapes, state encoding, and connectivity/suitability overlays using only `@aesfw/protocol` and `@aesfw/host-web/client`. But the per-actor projection (`packages/app/src/projections/project.ts`) never populates spatial data: `LocationDto` has no grid geometry, `EntityDto.spatial` is declared in `packages/protocol/src/snapshot.ts` but never filled, and connectivity is not exposed at all. This change closes that gap additively so 3.7 can read everything it needs from the presentation contract. Depends on: `add-grid-spatial-policy` (3.1), `add-placement-predicates-and-commands` (3.3), and `add-connectivity-requirement` (3.4) — all archived 2026-10-22.

## What Changes

- Add an optional `grid` object to `LocationDto` (`LocationGridDto`: `width`, `height`, `blocked`), populated for grid-policy locations from the core `Location.grid`. Suitability remains available through the existing `properties.values`.
- Add an optional `footprint` object (`FootprintDto`: `width`, `height`) to `SpatialDto` and populate `EntityDto.spatial` (`logical_position`, `orientation`, `footprint`) from the core `LogicalTransform` and `Footprint` stores.
- Add an optional `connectivity` object to `EntityDto` (`ConnectivityDto`: `role`, `network`, `connected`), populated from the core `ConnectivityNode` and `isConnected`, so the client can draw the connectivity overlay.
- Update the snapshot codecs to decode `grid`, `spatial` (including `footprint`), and `connectivity`, and add `connectivity` to the projection delta's tracked entity fields.
- Add requirement-tagged unit tests in `packages/app/src/projections/projections.test.ts` and `packages/protocol/src/codecs/snapshot.test.ts`.
- No **BREAKING** and no **HASH-CHANGING** artifacts: every new DTO field is optional, exactly as M2 did for additive protocol fields, so `PROTOCOL_VERSION` stays `1` and no existing snapshot, save, fixture, or golden encodes differently.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app/projections`: the full projection and delta SHALL expose location grid geometry, entity logical transform/footprint, and per-entity connectivity, and the snapshot codec SHALL decode the new optional fields.

## Impact

- **Packages:** `@aesfw/protocol` extends `src/snapshot.ts` (new optional `LocationGridDto`, `FootprintDto`, `ConnectivityDto`), `src/index.ts` (exports), and `src/codecs/snapshot.ts` (decode). `@aesfw/app` extends `src/projections/project.ts` (populate) and `src/projections/diff.ts` (track `connectivity`). No new runtime dependency is added to any pure package; `@aesfw/core` is unchanged.
- **Tick phases:** none (projections are read-only over `WorldReader` and the world's stores). **Store kinds:** reads `location`, `transform`, `footprint`, and `connectivityNode` (all already in the TDS-8.3 catalogue); no new store kind. **Commands/events:** none. **Error/diagnostic codes:** none new; the codec reuses `protocol.invalid_field`.
- **Verification impact:** new L1 projection tests (grid geometry, entity spatial/footprint, connectivity role/network/connected, absent when unplaced) and codec tests (the new optional fields decode; malformed fields are rejected).
- **Out of scope (later roadmap rows):** the client grid itself (3.7 `add-client-location-grid`, 3.8 `add-client-placement-mode`); fog filtering (8.4 `add-fog-filtered-projections`); transport connections and inter-location topology (M6); throughput (M5); occupancy-derived read models and the `locationSummary` topology summary beyond the grid geometry named here; any change to the 3.1/3.3/3.4 runtime semantics.
