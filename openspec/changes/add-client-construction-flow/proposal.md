# Proposal

## Why

Roadmap 08, M11a item 11.4c. Building is the core verb of the game, and the current build palette is a flat list without tier tabs, unlock states, costs, radius previews, or connector dragging — the placement flow of REF-13.3 is only partly realized. This row completes the construction flow on the world canvas, which is the make-or-break leg of **R-08** (the M11a playtest script starts with "builds the first S1 chain").

Depends on: `add-client-world-canvas` 11.4b and `add-reference-content-prototype` 11.1 (both proposed in this batch — must be archived first; 11.1 owns the presentation mappings and unlock hints this row renders). Order within M11: after 11.4b and 11.1; parallel with 11.4d.

## What Changes

- The context panel's build menu becomes tier-tabbed: entries grouped by the presentation mapping's `display.category_key` (one tab per tier), ordered by `sort_order`, each showing its code, shape, footprint, and construction costs from definition metadata next to the viewed location's stock — with no affordability judgment.
- Locked definitions (metadata `locked: true`) render greyed with their localized unlock hint and cannot be chosen.
- Placement on the canvas: the ghost follows the pointer with per-cell-change debounced `placement_query`; working-area and coverage radii from definition metadata are previewed around the ghost; click or Enter submits `PlaceEntityPlan`; construction proceeds by itself and awaiting-resources plans stay visible as dashed shapes.
- Drag-line connectors: with a connector selected, pressing and dragging traces an axis-aligned L path, each cell previewed by `placement_query`; on release one `PlaceEntityPlan` per valid cell is submitted in path order, invalid cells shown and skipped.
- Demolish mode (`X`): clicking an active entity submits `DeconstructEntity`; the mode returns to inspect on Escape.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/client`: the build palette requirement gains tabs, lock states, hints, and cost display; the placement-mode requirement gains the demolish mode; new requirements cover drag-line connectors and radius previews.

## Impact

- **Packages:** `reference/client-web` (build menu view in the context-panel slot, placement selectors, ghost layer). No framework package changes; no phases, store kinds, events, error codes, or diagnostic codes.
- **Commands:** `PlaceEntityPlan` (existing), `CancelEntityPlan`, `CommitConstruction`, `DeconstructEntity` (existing; demolish mode makes `DeconstructEntity` reachable from the canvas).
- **Protocol:** none — costs and radii come from definition metadata (PIC-4, displayable per A14).
- **Goldens:** none.

## Out of scope

- `add-client-context-panels` (11.4d): the info panels sharing the context-panel slot.
- `add-client-game-shell` (11.4a) / `add-client-world-canvas` (11.4b): the slot and the canvas/ghost layers this row draws into.
- `add-client-news-and-milestones` (11.4f): hints surfaced from rejected placement commands.
- `add-client-polish-and-accessibility` (11.4): the complete keyboard map (Shift+Arrows cursor integration) and axe checks.
- Live unlock progress in metadata (redesign R4; future `app/projections` row).
