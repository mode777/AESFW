# Tasks

## 1. Grid selectors (design D1–D5)

- [x] 1.1 Create `reference/client-web/src/selectors/grid.ts` with `gridCells`, `shapeGrammar`, `archetypeOf`, `entityShapes`, `stateEncoding`, `connectivityOverlay`, and `suitabilityOverlay`, and re-export them from `selectors/index.ts`; verify `pnpm type-check` accepts the module.
- [x] 1.2 Add cell-model tests to `src/selectors/grid.test.ts`: a 4×3 grid with blocked `[1, 6]` yields 12 cells with those blocked, and an abstract location yields `null`. [REF-12.2]
- [x] 1.3 Add shape-grammar tests: connector → `line`/`none`, residence → `circle`, slot extractor → `triangle_ring`/`progress_rise`, unknown → `box`. [REF-10.2]
- [x] 1.4 Add archetype-derivation tests over `DefinitionMetadataDto` parameters: slot-dependent source, area-dependent source, residence, producer, connectivity provider, and no-component fallback. [REF-10.2][PIC-4]
- [x] 1.5 Add entity-shape tests: placed entity at `[10, 12]` footprint 2×3 orientation 0, orientation 1 swaps the axes, unplaced entity omitted, and ascending entity-ID order. [REF-12.2][REF-14.3]
- [x] 1.6 Add state-encoding tests: constructing → `planned`/dashed, `missing_input` → `blocked`/`I`, `throughput_throttled` → `throttled`/`T`, processing progress 500/1000 → `processing`/500. [REF-10.3]
- [x] 1.7 Add overlay tests: a connected requirement is listed and an entity without connectivity is omitted; a property value 1000 is read and a missing property returns `null`. [REF-12.2]

## 2. Grid overlay view state (design D7)

- [x] 2.1 Add a `location` signal and a pure `toggleOverlay(current, key)` to `src/store/view-state.ts`, and add `src/store/view-state.test.ts` covering `C` → connectivity, `S` → suitability, and re-pressing the active key → none. [REF-12.2][REF-13.2]

## 3. Location grid view (design D6, D8)

- [x] 3.1 Create `src/views/location-grid.ts` rendering the layered SVG from the grid view models; verify `pnpm type-check` accepts the module.
- [x] 3.2 Add grid styles to `src/style/base.css` and the grid overlay/label i18n keys used by the view; verify the keys fall back to themselves when unlocalized. [REF-10.1]
- [x] 3.3 Wire the grid into `src/main.ts`: a location list, the `definition_metadata` query that populates the archetype map, the overlay keyboard handling, and the grid `update` on mirror changes. [REF-12.2][REF-14.1]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md`; mark row 3.7 with "✓ archived <date>" at archive time and update risks or dependencies only if they changed.
- [x] 4.2 Confirm no amendment to 01–07 is required (design.md records none).
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, with no new untraced requirement IDs in the claimed sections. [REF-10, REF-12.2, REF-14.3]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- Do not run `pnpm test:browser` in this container (Alpine/musl, no launchable browser).
