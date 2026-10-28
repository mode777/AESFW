# Tasks

## 1. Measurement scenarios

- [ ] 1.1 Implement the pan/zoom tour scenario (fixed waypoints, rAF frame-time sampling, p95) on R3; verify it runs on the verification box and writes its JSON result [REF-14.6].
- [ ] 1.2 Implement the tick-budget scenario (×16 session, HUD + panel + routes window, per-tick marks around delta-apply and selector recomputation, p95); verify the [REF-14.6] tick scenario.
- [ ] 1.3 Wire `bench.reference` on R4 at ×16 into the run and the nightly trend; verify the [REF-14.6, VER-14] worker scenario.
- [ ] 1.4 Implement the cold-start scenario (5-run median to first interactive frame); verify the [REF-14.6] cold scenario.

## 2. Budget work

- [ ] 2.1 Record all four measurements with verdicts; verify each budget scenario passes or its miss is profiled and attributed (client vs. kernel) [REF-14.6].
- [ ] 2.2 Apply the fix-first ladder to any frame-budget miss (LoD thresholds, culling margins, terrain cache granularity, marker batching, interpolation layer) re-measuring after each step; verify the pan/zoom scenario improves and passes or the miss is documented.
- [ ] 2.3 Apply selector memoization/narrowing to any tick-budget miss; verify the tick scenario passes or the miss is recorded for 12.6.

## 3. Conditional Canvas 2D fallback

- [ ] 3.1 If the SVG world level still misses the frame budget: implement the `worldLevelRenderer` interface with the `canvas2d` implementation consuming unchanged view models, with positioned test-id/label overlays and a build-time disable flag; verify the [REF-14.3] fallback scenarios and re-run axe with it enabled.
- [ ] 3.2 If SVG meets the budget: verify the fallback stays unmounted and record the decision with the measurements.

## 4. Close-out

- [ ] 4.1 Write the M11 milestone-log performance summary (budgets, numbers, box specs, fallback decision, kernel findings for M12); update 08 only if findings change M12's rows.
- [ ] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
