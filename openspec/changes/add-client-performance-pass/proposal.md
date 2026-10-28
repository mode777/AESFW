# Proposal

## Why

Roadmap 08, M11b item 11.6 (closing row of M11). The client budgets of REF-14.6 (as revised for the world canvas) have never been measured: frame time ≤ 8 ms p95 while panning/zooming the world at location level on R3 content, delta application + selector recomputation ≤ 2 ms p95 per published tick, worker tick time ≤ 2 ms median on R4 at ×16 (`bench.reference`), and time to first interactive frame ≤ 2 s cold on R3. This row measures the finished client on the full R4 content and, if SVG misses the frame budget, lands the Canvas 2D fallback for the world level — retiring the client half of **R-06** and feeding M12's blocking budgets.

Depends on: `add-reference-content-full` 11.5 and `add-client-polish-and-accessibility` 11.4 (both proposed in this batch — must be archived first). Order within M11: last row; after it M12 begins.

## What Changes

- L11 performance scenarios in the Playwright suite measure the four REF-14.6 budgets on the build/verification box: a scripted pan/zoom tour across all known locations at location level, a projection-driven delta/selector measurement over published ticks, `bench.reference` on R4 at ×16, and a cold-load measurement.
- Results are recorded with the budget verdicts in the M11 milestone log; a miss on the SVG frame budget triggers the fallback decision.
- Canvas 2D fallback for the world level, only if needed: `views/world/` swaps the world-level renderer (islands, lanes, fog, transports) for a Canvas 2D layer beneath the SVG location level; selectors and view models are unchanged; accessibility labels and `data-testid` hooks are preserved via positioned transparent elements (07 §14.3 "the selectors and view models are unchanged by that swap").
- Any overshoot that content or client tuning can fix (mounted-node counts, cache granularity, selector memoization) is fixed in this row rather than waived.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/client`: the client performance budgets become a measured, enforced requirement, with the conditional Canvas 2D world-level fallback.

## Impact

- **Packages:** `reference/client-web` (perf scenarios, optional world-level renderer swap); `@aesfw/host-node` only if `bench.reference` needs a CLI knob (it exists from 1.16). No framework package changes; no phases, store kinds, commands, events, error codes, or diagnostic codes.
- **CI:** the L11 scenarios run on the build/verification box / CI browser stages (AGENTS.md browser limitation); `bench.reference` joins the nightly trend.
- **Goldens:** none.

## Out of scope

- `add-performance-optimizations` (12.6): kernel/SoA work and `bench.large`; this row only surfaces kernel-bound misses as findings for M12.
- `add-full-determinism-matrix` (12.7) and the blocking-budget policy change (M12 exit).
- R4 balance tuning (11.5 owns content; 07 §8 targets).
