# Proposal

## Why

Roadmap 08, M11a item 11.4b. The client still switches between a separate world map and a location grid (the dashboard model the redesign removed from `docs/07`). This row delivers the continuous world canvas of REF-12.1 — the centerpiece of the game-HUD client and the largest leg of **R-08** (a living world the player builds in), and the surface whose SVG level-of-detail strategy must exist before 11.6 can measure the REF-14.6 budgets.

Depends on: `add-client-game-shell` 11.4a (proposed in this batch — must be archived first). Order within M11: after 11.4a; 11.4c/11.4d follow it; independent of the content rows.

## What Changes

- One continuous SVG world plane replaces the map/grid toggle: locations are islands placed by a deterministic client layout (region clusters in ascending region order, locations on a fixed ring in ascending ID order, islands sized from their grids), connections are lanes with duration labels, transport units are dots interpolated along lanes, and unknown locations are fog clouds showing only known connections.
- Camera: pan (drag/arrows), zoom around the cursor (+/−, wheel), Home recentres on the first established location; zoom selects one of three levels of detail (world / location / detail) per REF-12.1; the 40×40 grid, entity shapes, state encoding, and overlays render in place at location level and deeper.
- A minimap (bottom-left slot) shows the world layout with the viewport rectangle; clicking it moves the camera; the population-per-tier strip renders below it for the viewed location or owner.
- Interpolation stays visual-only and converges to authoritative transport states; reduced-motion settings are honoured later by 11.4 (the interpolation hook is laid out here).
- The world-map view and the map/grid toggle are removed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/client`: the world-map and map/grid-toggle requirements are replaced by the world canvas requirements (layout, camera, levels of detail, fog clouds, lanes, minimap); entity rendering moves in place.

## Impact

- **Packages:** `reference/client-web` (`selectors/layout.ts`, `views/world/`, input handling). No framework package, phase, store kind, command, event, error code, or diagnostic code changes.
- **Protocol:** none — data comes from snapshot locations/connections, transport detail, and the location summary (PIC-9.1, §9.3, §10.2, §10.4).
- **Commands:** `ActivateLocation`/`DeactivateLocation` now issue from island selection; explore/establish keep opening the (provisional) logistics window prefilled until 11.4e owns the final flow.
- **Goldens:** none. Selector tests replace map-view tests.

## Out of scope

- `add-client-game-shell` (11.4a): the HUD frame the canvas mounts into.
- `add-client-context-panels` (11.4d) and `add-client-construction-flow` (11.4c): panels, build menu, ghost, overlays' panel surfaces (overlay *views* on the canvas are this row).
- `add-client-windows-routes-and-trade` (11.4e): the final explore/establish flow and windows.
- `add-client-polish-and-accessibility` (11.4): reduced-motion enforcement, full keyboard completeness.
- `add-client-performance-pass` (11.6): budget measurement and the Canvas 2D fallback.
- Authored world positions (PIC-6 amendment) — recorded as a later enhancement in the redesign; the derived layout stays.
