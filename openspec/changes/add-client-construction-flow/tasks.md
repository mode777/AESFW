# Tasks

## 1. Build menu

- [x] 1.1 Implement `buildMenuEntries` (category tabs ascending by key, `sort_order` then ID, locked greyed with hint, costs next to stock); verify the [REF-12.3] grouping/lock/cost scenarios.
- [x] 1.2 Render the tier-tabbed build menu in the context-panel slot (build menu when nothing is selected); verify tab switching and locked-entry non-selection tests.

## 2. Placement flow on the canvas

- [x] 2.1 Move the ghost into the canvas ghost layer with pointer-follow and per-frame coalesced `placement_query`; verify the [REF-13.3] ghost-validity scenarios still pass.
- [x] 2.2 Implement radius previews (coverage circle, working-area outline) from definition metadata around the ghost; verify the [REF-13.3] radius scenarios.
- [x] 2.3 Verify end-to-end click/Enter submission and the awaiting-resources dashed persistence; verify the [REF-12.2, REF-13.3] scenarios.

## 3. Drag-line connectors and demolish

- [x] 3.1 Implement `dragPath` (axis-aligned L, x-first) as a pure selector with batched path queries; verify the [REF-13.3] path scenarios.
- [x] 3.2 Implement release-time submission of one `PlaceEntityPlan` per valid cell in path order with invalid cells skipped; verify the command-count and order test.
- [x] 3.3 Implement demolish mode (`X`, highlight, `DeconstructEntity`/`CancelEntityPlan` by lifecycle, mode display); verify the [REF-13.1] demolish scenarios.

## 4. Tests and documentation

- [x] 4.1 Update the placement selector tests for the widened signatures and run smoke flows incl. a placement flow on the canvas; verify flows green [VER-13.2].
- [x] 4.2 No 01–07 amendment expected (REF-13.3/A14 already cover this); record clarifications here.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
