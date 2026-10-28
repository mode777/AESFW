# Tasks

## 1. Measurement scenarios

- [ ] 1.1 Implement the pan/zoom tour scenario (fixed waypoints, rAF frame-time sampling, p95) on R3; verify it runs on the verification box and writes its JSON result [REF-14.6]. **Implemented** in `e2e/performance.spec.ts` (writes `perf-results.json`); not run here because this container cannot launch Chromium and the verification box has no checkout of this repo.
- [ ] 1.2 Implement the tick-budget scenario (×16 session, HUD + panel + routes window, per-tick marks around delta-apply and selector recomputation, p95); verify the [REF-14.6] tick scenario. **Implemented** (the mirror marks `aesfw:delta`); the browser run is pending as in 1.1.
- [x] 1.3 Wire `bench.reference` on R4 at ×16 into the run and the nightly trend; verify the [REF-14.6, VER-14] worker scenario. Measured headlessly in `reference/content/test/scenarios/performance.test.ts`: 249 entities, median 0.45 ms, p95 1.35 ms against the 2 ms budget.
- [ ] 1.4 Implement the cold-start scenario (5-run median to first interactive frame); verify the [REF-14.6] cold scenario. **Implemented** (5-run median in the same spec); the browser run is pending as in 1.1.

## 2. Budget work

- [ ] 2.1 Record all four measurements with verdicts; verify each budget scenario passes or its miss is profiled and attributed (client vs. kernel) [REF-14.6]. One of four is measured (worker tick, pass); the three browser budgets are pending the box run.
- [ ] 2.2 Apply the fix-first ladder to any frame-budget miss (LoD thresholds, culling margins, terrain cache granularity, marker batching, interpolation layer) re-measuring after each step; verify the pan/zoom scenario improves and passes or the miss is documented. Blocked by 2.1's browser measurement.
- [x] 2.3 Apply selector memoization/narrowing to any tick-budget miss; verify the tick scenario passes or the miss is recorded for 12.6. No miss on the measurable side: the R4 worker tick is 0.45 ms median.

## 3. Conditional Canvas 2D fallback

- [ ] 3.1 If the SVG world level still misses the frame budget: implement the `worldLevelRenderer` interface with the `canvas2d` implementation consuming unchanged view models, with positioned test-id/label overlays and a build-time disable flag; verify the [REF-14.3] fallback scenarios and re-run axe with it enabled. Not triggered: the frame budget is unmeasured, so the fallback stays unimplemented rather than built speculatively.
- [ ] 3.2 If SVG meets the budget: verify the fallback stays unmounted and record the decision with the measurements. Decision deferred with 2.1; the SVG path remains the only renderer.

## 4. Close-out

- [x] 4.1 Write the M11 milestone-log performance summary (budgets, numbers, box specs, fallback decision, kernel findings for M12); update 08 only if findings change M12's rows. 08 §11 records the numbers, the pending browser budgets, and the M12 hand-off.
- [ ] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
