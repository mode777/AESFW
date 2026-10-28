# Tasks

## 1. Layout and camera selectors (pure)

- [ ] 1.1 Implement `worldLayout` (clusters, rings, island sizing, lanes-once) in `selectors/layout.ts`; verify [REF-12.1] ordering and lane scenarios incl. cluster order determinism.
- [ ] 1.2 Implement camera math (`screenToWorld`, zoom buckets, pan clamps, `Home` recentring) as pure helpers; verify [REF-13.5] scenarios for zoom/anchor/Home.
- [ ] 1.3 Implement `minimapToWorld`; verify the click-mapping [REF-11] scenario.

## 2. World canvas view

- [ ] 2.1 Build `views/world/canvas.ts` (single SVG, camera root transform, seven layers, rAF-gated rendering); verify rendering happens only on change [REF-14.3].
- [ ] 2.2 Implement island terrain paths (one cached `<path>` per location) and silhouettes with region outline patterns; verify [REF-12.1] world-level rendering.
- [ ] 2.3 Implement lanes with duration labels (solid/dashed by enabled) and fog clouds showing known lanes only; verify [REF-12.1, PIC-9.3] fog-leak scenarios.
- [ ] 2.4 Mount the existing grid renderer in place at location level (entities, overlays, throughput gauge) with LoD and viewport culling; verify [REF-12.2, REF-14.3] mount/culling scenarios.
- [ ] 2.5 Implement transport dots with lane interpolation converging on authoritative states; verify [REF-12.1, PIC-14] interpolation scenarios.
- [ ] 2.6 Implement the minimap (layout, viewport rect, click-to-move) and the population strip (viewed location or owner); verify [REF-11] scenarios.

## 3. Interaction rewiring

- [ ] 3.1 Rewire pointer and keyboard input to the camera gestures and canvas hit-testing (ghost → entity → island); verify selection still opens the inspector surface and island actions issue `ActivateLocation`/`DeactivateLocation` [REF-12.1].
- [ ] 3.2 Delete `views/world-map.ts`, the map/grid toggle, and their view-state; verify the removed requirements' tests are gone and no `M` mapping remains [REF-12.1].

## 4. Tests and documentation

- [ ] 4.1 Update the smoke flows (1, 2, 4, 6) to the canvas shell; verify they pass against the new world area [VER-13.2].
- [ ] 4.2 Update selector tests: replace map tests with layout/camera tests; verify [REF-10.2, REF-12.1, REF-13.5] coverage.
- [ ] 4.3 No 01–07 amendment expected (07 §12.1/§14.3 already specify this); record clarifications here.
- [ ] 4.4 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
