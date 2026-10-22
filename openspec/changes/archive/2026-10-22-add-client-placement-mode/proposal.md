# Proposal

## Why

Roadmap 08, M3 item 3.8 (`add-client-placement-mode`, capability `reference/client`, size M). M3 is the space-and-construction milestone and retires R-09 (spatial and placement complexity). Rows 3.1–3.7b delivered the grid spatial policy, construction lifecycle, placement predicates and commands, the read-only `placement_query` through the web host, the R1 builder-stage content, the per-actor spatial projection, and the SVG location grid. The client can now *see* the grid, but the player still cannot *build* on it: there is no build palette, no placement ghost, and no way to submit the construction commands. This row closes that loop. Depends on: `add-client-location-grid` (3.7) and `add-placement-query-host` (3.7b) — both archived 2026-10-22.

## What Changes

- Add a **build palette** derived from the `definition_metadata` query (REF-13.3, PIC-4): placeable entity definitions (those with a `placement` component) with selection.
- Add a **placement ghost** on the location grid whose validity is **authoritative**: on every cursor change the client sends a `placement_query` (PIC-12.1) and renders the ghost as valid (ink dashed) or invalid (accent dashed, reasons listed), per REF-13.3 and REF-10.3. The client computes no mechanics.
- Add **keyboard placement** (REF-13.1, REF-13.2, REF-13.3): arrow keys move the ghost, `R` rotates it, `Enter` confirms (`PlaceEntityPlan`), `Escape` cancels, and `B` opens the palette / enters place mode.
- Add the **construction commands** through the existing command set: `PlaceEntityPlan` (placement mode), and `CommitConstruction`, `CancelEntityPlan`, `DeconstructEntity` (selected entity, REF-12.2, REF-12.3).
- Add **command-result feedback** (REF-13.4): a localized notice for a rejected command result.
- Add pure placement selectors, extend client-local view state, add styles and i18n keys, and extend the pure selector tests.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts; no framework, save-format, protocol-version, or golden change.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `reference/client`: extended with the build palette, the authoritative placement ghost, the placement keyboard map and mode, the construction-command submission, and command-result feedback.

## Impact

- **Packages:** `@aesfw-ref/client-web` gains `src/selectors/placement.ts`, `src/views/build-palette.ts`, and `src/views/notice.ts`; extends `src/selectors/index.ts`, `src/store/view-state.ts`, `src/views/location-grid.ts`, `src/views/inspector.ts`, `src/views/top-bar.ts`, `src/main.ts`, `src/style/base.css`, and adds `src/selectors/placement.test.ts` plus `src/store/view-state.test.ts` cases. No framework package changes; the client continues to import only `@aesfw/protocol` and `@aesfw/host-web/client`.
- **Tick phases:** none (client only). **Store kinds:** none. **Events:** none. **Error codes:** none (the client surfaces existing rejection codes such as `state_revision_mismatch`). **Diagnostic codes:** none.
- **Commands exercised:** `PlaceEntityPlan`, `CommitConstruction`, `CancelEntityPlan`, `DeconstructEntity`; queries: `placement_query`, `definition_metadata`.
- **Out of scope (later roadmap rows):** the world map and transport interpolation (6.8 `add-client-world-map`); throughput indicators (5.4 `add-client-throughput-indicators`); population/transition UI (7.9 `add-client-population-and-transitions`); economy and planning views (4.7 `add-client-economy-and-planning`); the route editor (6.9); coverage radii (later coverage rows); fog filtering (8.4). No client-side placement-validity computation (REF-17).
- **Verification impact:** `pnpm test` gains pure placement selector tests and view-state tests; `pnpm verify` and `pnpm trace` stay green. Browser/Playwright checks are out of scope for this container (Alpine/musl, no launchable browser) and are not claimed.
