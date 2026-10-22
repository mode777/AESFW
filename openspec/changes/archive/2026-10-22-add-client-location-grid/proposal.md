# Proposal

## Why

Roadmap 08, M3 item 3.7 (`add-client-location-grid`, capability `reference/client`, size L). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Rows 3.1–3.6b delivered the grid spatial policy, construction lifecycle, placement, connectivity, slot/area sources, the R1 builder-stage content, and the per-actor projection of grid geometry, entity transforms/footprints, and connectivity. The reference client still renders only tables and the inspector, so the player cannot see the 40×40 location grid, its buildable and blocked cells, the entities placed on it, or the connectivity and suitability overlays that make the "space" currency legible. This row adds that view. Depends on: `add-client-inspector-and-tables` (2.9), `add-reference-content-builder-stage` (3.6), and `add-spatial-projection-data` (3.6b) — all archived 2026-10-22.

## What Changes

- Add pure grid selectors: the cell model (buildable/blocked), the REF-10.2 shape grammar, archetype derivation from mechanically safe definition metadata, entity shape placement (position, orientation, footprint), REF-10.3 state encoding, and the connectivity and suitability overlays.
- Add the SVG location grid view (REF-12.2) with background cell/hatch path, entity layer keyed by entity ID, and overlay layers.
- Add the connectivity (`C`) and suitability (`S`) overlays as client-local view state, and a selected-location signal.
- Wire the grid into the shell: a location list, the metadata query that supplies archetypes, and overlay keyboard handling.
- Add grid styles and i18n keys; extend the pure selector tests.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `reference/client`: extended with the location grid view, the grid/shape/state/overlay selectors, and the grid overlay view state.

## Impact

- **Packages:** `@aesfw-ref/client-web` gains `src/selectors/grid.ts`, `src/views/location-grid.ts`, extends `src/store/view-state.ts`, `src/main.ts`, `src/style/base.css`, and `src/selectors/selectors.test.ts` (or a new `grid.test.ts`). No framework package changes; the client continues to import only `@aesfw/protocol` and `@aesfw/host-web/client`.
- **Tick phases:** none. **Commands:** none (placement is row 3.8). **Events:** none. **Error codes:** none. **Store kinds:** none.
- **Out of scope (later roadmap rows):** placement mode, the build palette, the ghost preview, and the construction commands (3.8 `add-client-placement-mode`); the world map and transport interpolation (6.8 `add-client-world-map`); throughput indicators (5.4 `add-client-throughput-indicators`); population/transition UI (7.9); coverage radii (later coverage rows); fog filtering (8.4).
- **Verification impact:** `pnpm test` gains pure grid selector tests; `pnpm verify` and `pnpm trace` stay green. Browser/Playwright checks are out of scope for this container (Alpine/musl, no launchable browser).
