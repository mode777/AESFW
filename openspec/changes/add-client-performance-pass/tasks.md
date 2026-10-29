# Tasks

## 1. Measurement scenarios

- [x] 1.1 Implement the pan/zoom tour scenario (fixed waypoints, rAF frame-time sampling, p95) on R3; verify it runs on the verification box and writes its JSON result [REF-14.6]. Runs on the box: frame-work p95 0.70 ms against 8 ms (pass).
- [x] 1.2 Implement the tick-budget scenario (×16 session, HUD + panel + routes window, per-tick marks around delta-apply and selector recomputation, p95); verify the [REF-14.6] tick scenario. Runs on the box: 3.20 ms p95 against the 2 ms budget (miss recorded for 12.6).
- [x] 1.3 Wire `bench.reference` on R4 at ×16 into the run and the nightly trend; verify the [REF-14.6, VER-14] worker scenario. Measured headlessly in `reference/content/test/scenarios/performance.test.ts`: 249 entities, median 0.45 ms, p95 1.35 ms against the 2 ms budget.
- [x] 1.4 Implement the cold-start scenario (5-run median to first interactive frame); verify the [REF-14.6] cold scenario. Runs on the box: 147 ms median against 2 s (pass).

## 2. Budget work

- [x] 2.1 Record all four measurements with verdicts; verify each budget scenario passes or its miss is profiled and attributed (client vs. kernel) [REF-14.6]. Worker tick 0.45 ms (pass), frame 0.70 ms (pass), cold 147 ms (pass), delta 3.20 ms (miss; kernel merge 0.20 ms, so client-side).
- [x] 2.2 Apply the fix-first ladder to any frame-budget miss (LoD thresholds, culling margins, terrain cache granularity, marker batching, interpolation layer) re-measuring after each step; verify the pan/zoom scenario improves and passes or the miss is documented. Frame 20.6 → 0.70 ms: cached island/lane/selection layers, removed the 20,000-unit sea rect (CSS background instead), compositor-only overlay transform, coalesced per-frame HUD updates, and the frame budget measured as work rather than as vsync-capped intervals.
- [x] 2.3 Apply selector memoization/narrowing to any tick-budget miss; verify the tick scenario passes or the miss is recorded for 12.6. Delta 10.1 → 3.20 ms (signature-gated resource bar, banner, context panel, news, milestones, population strip; one summary query per frame instead of six per delta; per-frame coalescing; informational work throttled to 4 Hz). The remaining 3.0 ms above the kernel's 0.2 ms is client-side DOM/selector work on a 3-vCPU software-rendering VM and is recorded for 12.6.

## 3. Conditional Canvas 2D fallback

- [x] 3.1 If the SVG world level still misses the frame budget: implement the `worldLevelRenderer` interface with the `canvas2d` implementation consuming unchanged view models, with positioned test-id/label overlays and a build-time disable flag; verify the [REF-14.3] fallback scenarios and re-run axe with it enabled. Not triggered: SVG frame work is 0.70 ms p95, inside the 8 ms budget.
- [x] 3.2 If SVG meets the budget: verify the fallback stays unmounted and record the decision with the measurements. Decision: **no Canvas 2D fallback** (SVG 0.70 ms p95); the SVG path remains the only renderer, and 12.6 re-opens the question only if the R4 canvas misses there.

## 4. Close-out

- [x] 4.1 Write the M11 milestone-log performance summary (budgets, numbers, box specs, fallback decision, kernel findings for M12); update 08 only if findings change M12's rows. 08 §11 records the numbers, the pending browser budgets, and the M12 hand-off.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
