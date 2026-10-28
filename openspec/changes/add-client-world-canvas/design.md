# Design

## Context

See proposal.md "Why". After 11.4a the HUD frame hosts the existing location grid as the world area with provisional windows; the grid renderer (SVG, keyed entities, overlays) and its selectors are solid from M3–M8. Snapshot locations carry `location.grid`, `properties.values`, `knowledge`, region, and connections; transport detail carries per-unit movement state (M6/M9).

## Goals / Non-Goals

**Goals:**

- One canvas, one camera, three levels of detail, per REF-12.1/14.3.
- A pure, unit-tested layout and camera math with no rendering concerns.
- Interpolation that never delays or reorders commands (PIC-14).

**Non-Goals:**

- Canvas 2D rendering (11.6 fallback only); authored positions (PIC-6 later enhancement); panel/window content (11.4d/11.4e); reduced-motion and full keyboard polish (11.4); minimap perf budgets (11.6).

## Decisions

### D1. Layout math (selectors/layout.ts)

Pure `worldLayout(locations, connections)`:
1. clusters in ascending region ID order (unknown-region locations form a trailing virtual cluster);
2. within a cluster, islands on a ring in ascending location ID order: ring radius grows with island count; first island at angle 0 (12 o'clock), then clockwise;
3. island size = `max(grid w,h)` scaled by a fixed cell size; cluster spacing = max island diameter + fixed margin.
Determinism: only projected data and integer/permille-free fixed constants; results cached by revision in a computed. Region outline patterns per REF-10.2 (α solid hairline, β double).

### D2. Camera

`camera` view state `{cx, cy, zoom}`; `screenToWorld/worldToScreen` pure helpers. Zoom buckets for LoD: world < 0.25, location 0.25–0.8, detail > 0.8 (tuning constant in one place). Zoom anchors on the cursor for wheel/`+`/`-` and the centre for keys. Pan clamps to the layout bounds plus margin. All gestures write view state; rendering reads it — no gesture code in views.

### D3. Rendering structure

Single SVG, root `<g transform>` for the camera; layers in order: sea/lanes, terrain, overlays, entities, status markers, ghost, selection. Island terrain is one `<path>` per location built from the grid cells and hatches, cached by location revision (rebuild only on `location_updates` for that location). Entity `<g>` keyed by entity ID reuses the existing shape/state-encoding selectors; mount conditions per the spec (LoD + viewport culling). The `requestAnimationFrame` loop renders on signal change, camera move, or active interpolation only.

- *Alternative: keep the grid as a nested separate SVG.* Two coordinate systems and duplicate camera plumbing; rejected.

### D4. Interpolation

Per transport unit: keep the last two authoritative movement states (from transport detail) and the lane geometry from the layout; the dot's position is `lerp` by elapsed ticks between depart and arrive, clamped to arrival. This is display math (floats allowed client-side); commands and projections are untouched. The hook checks `prefers-reduced-motion` so 11.4 only flips the flag to jump-between-authoritative-positions.

### D5. Selection and commands on the canvas

Click hit-testing top-down: ghost (place mode) → entity → island. Island selection at world level offers activate/deactivate and opens the (provisional) logistics window prefilled for explore/establish exactly as the old map action bar did — the selectors carry over; 11.4e moves the entry point into the final routes window. Keyboard grid cursor (Shift+Arrows) operates on the focused island at location level; its full integration is completed by 11.4.

### D6. Minimap

A second small SVG reusing `worldLayout` at a fixed scale with a viewport `<rect>` derived from the camera; click maps minimap coordinates through the same transform (pure helper `minimapToWorld`). Population strip consumes location summaries (viewed location) or the owner aggregate.

## Risks / Trade-offs

- [SVG frame cost at R3 scale (6 islands, hundreds of entities)] → LoD + culling + cached terrain paths bound mounted nodes; 11.6 measures the REF-14.6 budget and owns the Canvas fallback if SVG misses it.
- [Ring layout may crowd with 6+ islands in one region] → radius growth rule keeps min pairwise distance; R4 (11.5) exercises it before 11.6 measures.
- [Interpolation drift on lagging snapshots] → convergence to authoritative state each publish; no prediction beyond the known arrival tick.

## Migration Plan

- The map view and toggle are deleted with their tests; layout/map selectors are replaced by `worldLayout` (pure, tested independently). Rollback = revert.
