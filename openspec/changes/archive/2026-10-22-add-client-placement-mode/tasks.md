# Tasks

## 1. Placement selectors (design D1–D5, D8)

- [x] 1.1 Create `reference/client-web/src/selectors/placement.ts` with `paletteEntries`, `placementFootprint`, `ghostShape`, `ghostValidity`, `reasonLabels`, `placementQueryPayload`, `placementKeyAction`, `placeEntityPlanPayload`, `constructionCommands`, and `commandNotice`, and re-export them from `selectors/index.ts`; verify `pnpm type-check` accepts the module.
- [x] 1.2 Add palette tests to `src/selectors/placement.test.ts`: a placeable definition is listed with its label and archetype, a definition without `placement` is omitted, and entries sort by ascending definition ID. [REF-13.3][REF-12.4][PIC-4]
- [x] 1.3 Add footprint/ghost tests: `[3, 3]` is read, a missing component returns `null`, and orientation `1` swaps a `3×4` footprint to `4×3`. [REF-13.3][REF-10.2][PIC-4]
- [x] 1.4 Add authoritative-preview tests: `null` → `unknown`, a valid result → `valid`, an invalid result → `invalid` with `reasonLabels` preserving `not_buildable`, the exact query payload for a cursor, and `null` when no definition is selected. [REF-13.3][REF-10.3][PIC-12.1]
- [x] 1.5 Add keyboard tests: `ArrowRight` moves, an edge clamps, `R` advances and wraps at four, `Enter` confirms, `Escape` cancels, an unhandled key is `none`, and a move clears the stale result. [REF-13.1][REF-13.2][REF-13.3]
- [x] 1.6 Add plan-payload tests: the exact `PlaceEntityPlan` payload for a cursor and `null` when no definition is selected. [REF-13.3][PIC-12]
- [x] 1.7 Add construction-command tests: `planned` and `constructing` offer `CancelEntityPlan` and `CommitConstruction`, `active` offers `DeconstructEntity`, and an unknown lifecycle offers none. [REF-12.2][REF-12.3][REF-13.3]
- [x] 1.8 Add command-notice tests: a rejected result yields a notice containing the rejection code, an accepted result yields `null`. [REF-13.4][PIC-13]

## 2. Placement view state (design D6)

- [x] 2.1 Add a `placement` signal carrying a `PlacementCursor` and a pure `nextMode(current, key)` to `src/store/view-state.ts`; extend `src/store/view-state.test.ts` with `B` → `place`, `Escape` → `inspect`, and an unrelated key unchanged. [REF-13.1][REF-13.2]

## 3. Placement views (design D7, D8)

- [x] 3.1 Add the ghost layer to `src/views/location-grid.ts` (valid/invalid classes, reasons line, `mode`/`placement` subscriptions, pointer cursor move and click confirm); verify `pnpm type-check` accepts the module.
- [x] 3.2 Create `src/views/build-palette.ts` (one button per palette entry, selected state) and `src/views/notice.ts` (command-result toast); verify `pnpm type-check` accepts them.
- [x] 3.3 Extend `src/views/inspector.ts` to render and issue the `constructionCommands` for the selected entity, and `src/views/top-bar.ts` to show the current mode. [REF-12.2][REF-12.3][REF-13.1]
- [x] 3.4 Add palette, ghost, notice, and mode styles to `src/style/base.css` and the placement i18n keys used by the views; verify missing keys fall back to themselves. [REF-10.1]

## 4. Shell wiring (design D4–D8)

- [x] 4.1 Wire `src/main.ts`: mount the palette, populate palette entries and footprints from `definition_metadata`, route `placement_result` into view state, coalesce `placement_query` per frame, handle the placement keyboard map (`B`, arrows, `R`, `Enter`, `Escape`), submit `PlaceEntityPlan`, and show `command_result` notices. [REF-13.1][REF-13.2][REF-13.3][REF-13.4][REF-14.1]

## 5. Documentation and verification

- [x] 5.1 Review `docs/08_Implementation_Roadmap.md`; mark row 3.8 with "✓ archived <date>" at archive time, update risks or dependencies only if they changed, and add the M3 milestone-log entry to §11 only if the exit criteria are demonstrable without browser verification.
- [x] 5.2 Confirm no amendment to 01–07 is required (design.md records none).
- [x] 5.3 Run `pnpm verify` and `pnpm trace`; all green, with no new untraced requirement IDs in the claimed sections. [REF-10.2][REF-10.3][REF-12.2][REF-12.4][REF-13.1][REF-13.2][REF-13.3][REF-13.4][PIC-4][PIC-12.1][PIC-13]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- Do not run `pnpm test:browser` or Playwright in this container (Alpine/musl, no launchable browser).
