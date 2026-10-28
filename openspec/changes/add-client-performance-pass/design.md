# Design

## Context

See proposal.md "Why". 11.4b built the SVG canvas with levels of detail, culling, and cached terrain paths; 11.5 delivered R4; 1.16's bench harness records JSON results. Browser measurement runs on the build/verification box or CI (AGENTS.md: the Alpine dev container cannot launch Playwright's Chromium). REF-14.3 names the Canvas 2D fallback as this row's escape hatch.

## Goals / Non-Goals

**Goals:**

- The four budgets measured by reproducible scenarios with recorded numbers, not vibes.
- Fix-first policy: mounted-node, cache, and selector wins before any renderer swap.
- A fallback that, if needed, changes no selector and loses no test hook.

**Non-Goals:**

- Kernel optimization (12.6: SoA stores, incremental windows); making budgets blocking (M12 exit); R4 re-balancing; WebGPU or workers-for-render experiments.

## Decisions

### D1. Scenario definitions (L11)

1. **Pan/zoom tour:** a scripted camera path (fixed waypoints and easing) crossing every known location at location level for 30 s on the R3 world; frame times sampled from `requestAnimationFrame` deltas; p95 reported.
2. **Tick budget:** with the HUD, one context panel, and the routes window open, run at ×16 for 60 s; per published tick, time `mirror.applyDelta` + recomputed selectors (performance marks around the composition root's update path); p95 reported.
3. **Worker budget:** `bench.reference` (exists since 1.16) executed on R4 at ×16; median reported from its JSON output.
4. **Cold start:** navigate to the built client with a cold profile; time from navigation start to the first frame where the HUD signals interactive (a marked state); median of 5 runs.

Scenarios are Playwright specs asserting budget + writing a JSON results file; a summary lands in the M11 milestone log.

### D2. Fix-first ladder

On a frame-budget miss, in order: tighten LoD thresholds and culling margins; coarsen terrain cache granularity; batch status markers; move interpolation off the entity layer; only then the fallback (D3). Each step is measured before the next. Tick-budget misses are selector work (memoization by revision, narrowing computed graphs); a persistent miss that is provably kernel-side is recorded as a 12.6 finding with the profile, not patched client-side.

### D3. Fallback architecture (only if triggered)

A `worldLevelRenderer` interface with two implementations (`svg`, `canvas2d`) chosen by a build-time/build-flag constant; both consume the same view models from `worldLayout` and the transport interpolation state. The canvas layer draws below the SVG; hit-testing uses the same positioned transparent elements that carry `data-testid` and `aria-label`s (world-level subjects are islands, lanes, and transports — coarse targets, so the overlay is cheap). Location level stays SVG (accessibility, ghost, overlays).

### D4. Environment honesty

Numbers from the verification box are recorded with the box's specs (3 vCPU, llvmpipe/Chromium headless per docs/verification tooling); headless-llvmpipe results are conservative for CPU-side work but not representative of GPU raster — recorded as such, and the human playtest (M11a) doubles as the perceptual check. `prefers-reduced-motion` off during measurements.

## Risks / Trade-offs

- [Headless timing noise] → 5-run medians, fixed seeds, no network (bundled content), and box specs recorded; budgets checked against p95/median as specified.
- [Falling back erodes accessibility] → D3 keeps labels and test ids on positioned elements; axe scans (11.4) re-run with the fallback on.
- [Kernel-bound misses block M11b closure] → a proven kernel miss is handed to 12.6 as a recorded finding; this row's scope is the client budgets, and M11b closes on measured, documented numbers (08 M11b has no explicit exit criteria beyond the budgets).

## Migration Plan

- Scenarios and (conditionally) the renderer interface are additive; the default path is unchanged unless the fallback triggers. Rollback = revert.
