# Design

## Context

See proposal.md "Why". The placement selectors exist and are tested (footprint, ghost shape, `placement_query` payloads, keyboard map, command submission, construction commands from selection); the ghost renders on the grid today. 11.4a delivers presentation data (category keys, sort order, hints); 11.4b delivers the canvas ghost layer and pointer hit-testing; definition metadata carries `locked: true` for unsatisfied unlocks (7.5) and numeric parameters (radii, costs) displayable per A14. Construction transitions proceed without commit (spec `sim/construction`).

## Goals / Non-Goals

**Goals:**

- The REF-13.3 placement flow complete on the canvas: choose → ghost with radii → authoritative validity → submit → it builds itself.
- Drag-line connector laying as one gesture = N independently validated commands (REF-9 principle 5).
- A build menu whose grouping, locking, and costs come entirely from presentation + metadata.

**Non-Goals:**

- Affordability judgments or "can't afford" greying (A14: display only); live unlock progress (redesign R4); panel tabs Build/Demolish/Routes beyond the demolish *mode* (11.4e owns Routes); keyboard-cursor polish (11.4).

## Decisions

### D1. Build menu data flow

`buildMenuEntries` consumes definition metadata (PIC-4), the presentation mapping (PIC-6), localization, and the viewed location's summary (PIC-10.2). Tabs derive from the distinct `display.category_key` values of placeable definitions, ordered by the tier order embedded in the reference keys (`ref.tier.category.tier1|tier2` — the general rule is ascending category key, which yields tier order for the reference package and stays package-agnostic). Entries within a tab sort by `sort_order`, then ascending definition ID. Stock comes from the location summary's inventory entries; both cost and stock format through the resource scale.

### D2. Debounced ghost queries

Pointer motion updates the ghost cell; queries are coalesced to one in-flight `placement_query` per frame: a new cell cancels/replaces the pending request; the ghost shows `unknown` while a result is pending (existing `ghostValidity`). Path previews batch: one query per distinct cell of the L path, issued in path order, results keyed by cell.

### D3. L-path geometry

Pure `dragPath(from, to)` = horizontal leg then vertical leg (x first, then y), matching connector laying habit; single-bend by construction. Path order = press cell → release cell along the legs. Each valid cell submits its own `PlaceEntityPlan` immediately on release (no batch command; each is independently validated and logged — REF-9 principle 5).

### D4. Demolish mode reuses selection

Demolish highlights the hovered entity with the accent outline and submits `DeconstructEntity`/`CancelEntityPlan` by lifecycle, using the existing `constructionCommands` mapping — no new selector, one new mode in `nextMode` and a hover rule in the canvas input layer.

### D5. Awaiting-resources visibility

No client change beyond encoding: the canvas already draws not-yet-active lifecycles dashed (state encoding); this row verifies the `awaiting_resources` case explicitly (spec scenario) since REF-13.3 names it.

## Risks / Trade-offs

- [N queries per drag frame could flood the worker] → coalescing (D2) plus the existing host-side catch-up limit; connectors are 1×1 so payloads are minimal.
- [Tier-tab derivation could misorder exotic category keys] → ascending-key rule is deterministic and documented; presentation authors control keys.
- [Ghost validity flickers while panning] → queries issue only on cell change, not camera change.

## As built

- **Build menu** (`selectors/build-menu.ts`, `views/hud/build-menu.ts`): `buildMenu` groups placeable definitions into tabs by the presentation mapping's `category_key` (ascending), orders entries by `sort_order` then ID, marks locked entries from definition metadata with their `<id>.unlock_hint`, and pairs each construction cost with the viewed location's stock. Unmapped definitions land in an `uncategorised` tab instead of vanishing. The context panel shows the build menu when nothing is selected and the island actions when an island is selected.
- **Ghost and queries** (2.1, 2.3): the authoritative ghost stays in the existing grid renderer, which now also reports entity clicks; pointer movement still coalesces one `placement_query` per animation frame, and click/Enter submit one `PlaceEntityPlan`. A rejected plan shows the host's reasons; an `awaiting_resources` plan keeps its dashed shape because the renderer derives state from the entity lifecycle.
- **Radius previews** (2.2): not implemented as canvas geometry in this row. The coverage radius and working-area size are already in definition metadata and in the grid's suitability/coverage overlays; drawing them around the ghost needs the per-cell working-area placement that 11.4c's follow-up owns. Recorded as a deviation rather than claimed: the overlay keys `C`/`S`/`O`/`T` still render the authoritative overlays.
- **Drag lines** (`selectors/drag.ts`): `dragPath` traces the axis-aligned L, x first, both ends inclusive. The grid view reports `pointerdown`/`pointerup` cells; release submits one `PlaceEntityPlan` per cell in path order. The client does not pre-filter cells: placement validity is authoritative (04 §14), so a rejected cell produces no entity and its rejection is reported. A single-cell drag falls back to the click flow.
- **Demolish** (3.3): `X` enters `demolish` mode (and `X` no longer opens the exchange window, which keeps its action-bar button), clicking an entity issues `CancelEntityPlan` for a planned/awaiting plan and `DeconstructEntity` otherwise, and the action bar keeps showing the blocked count. The full 07 §13.2 key map (E toggling the selected entity, Tab cycling, Ctrl+K) stays 11.4's job.
- **Tests**: `selectors/build-menu.test.ts` (tab order, locks/hints, cost/stock, uncategorised, non-placeable) and the drag-path cases; the mode tests cover `X` and Escape.

## Migration Plan

- Replaces the palette view inside the context-panel slot; selectors' signatures widen (metadata + presentation inputs) — callers updated in the same change. Rollback = revert.
