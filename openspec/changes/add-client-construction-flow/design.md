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

## Migration Plan

- Replaces the palette view inside the context-panel slot; selectors' signatures widen (metadata + presentation inputs) — callers updated in the same change. Rollback = revert.
