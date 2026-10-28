# Design

## Context

See proposal.md "Why". The scenario runner (`@aesfw/testkit/scenario`) is pure, applies scheduled commands through the real command gateway (6.7), and returns a report; it parses `expect` but ignores it. `aesfw run` (host-node CLI) prints reports and exits non-zero on invariant findings. The M4/M6 milestone logs named `expect` evaluation as M11 work. 11.1 delivers the R3 content these strategies run on.

## Goals / Non-Goals

**Goals:**

- `expect` evaluation exactly as VER-9.1 specifies, theme-free, fixture-tested.
- Metrics as pure data from the runner; CSV writing only in the CLI shell.
- Strategies and target checks that make 07 §8 measurable and feed 11.3's SCN-14.

**Non-Goals:**

- New scenario-format fields (VER-9.1 already defines `expect`); hashing/goldens (11.3); worker/client performance budgets; tuning methodology beyond scripted strategies.

## Decisions

### D1. `expect` evaluation in the runner, not the test

Evaluation happens inside the pure runner at the entry's `at` tick, after that tick's phases, so CLI and Vitest see identical results. Failures don't abort the run: the remaining ticks still execute (deterministic, and later expectations may still be informative); the report aggregates all entries.

- *Alternative: evaluate in the test harness after the run.* Duplicates resolution logic in two shells; rejected.

### D2. Metric resolution

`population` resolves from the location summaries' `population_by_tier` aggregated over the world (or the named location); `satisfaction` resolves a residence by `@<definition>#<n>` reference — the same resolution the command scheduler uses (6.7) — and reads its `satisfaction` permille from the need read model. `event_count` counts matching events by `type` and optional `reason` from the run's event log since tick 0. All values are integers; comparators are exact.

### D3. Metrics checkpoints

The runner emits a metrics row every `metrics_interval` ticks (default `60`, scenario-overridable via `run.metrics_interval`) built from the same sources as D2 plus owner balance/net rate (PIC-10.6 data available in-session) and per-exchange traded volume from the event log (`Traded` events). Rows are plain arrays of records — the CLI renders CSV with a stable header (tick first, then columns in ascending ID order for determinism). No floating point: rates and balances are base units; satisfaction permille.

### D4. Strategies as player command schedules

Each strategy is a scenario file whose `commands` are the build orders a player could issue (`PlaceEntityPlan` sequences, purpose-lock toggles, transport orders, trade orders). Entity references use the `@definition#n` syntax against the start state, which 11.1 fixes (design D2) — a strategy therefore pins part of the start state; 11.1's design records the initial entities so references stay stable.

- *Alternative: a scripted "bot" API.* Out of 05 scope and unnecessary; rejected.

### D5. Target checks as reference tests

Each 07 §8 target is one Vitest case over one strategy run (opening, overexpansion, pyramid), asserting from the report and metrics rows — not from golden hashes. The trade-share target compares revenue by source (owner-economy entries: `exchange.<id>` sources vs tier income) over the equilibrium window. If a target fails, the fix is a content retune (recorded in 11.1's file set) or a documented deviation in the milestone log — the check itself stays.

### D6. Ordering and determinism

Metrics assembly iterates residences, tiers, locations, and exchanges in ascending ID order; event scans iterate the log in emission order. The runner stays pure: no clock, no I/O; CSV strings are built by the CLI.

## Risks / Trade-offs

- [Strategies overfit the start state; content retunes break them] → strategies assert outcomes (advancement tick window), not exact entity tables; retunes re-run the corpus in the same change.
- [7,200-tick runs slow CI] → target checks use shorter horizons (≤ 2,000 ticks); only SCN-14 (11.3) runs 7,200 ticks and is nightly-class.
- [Trade-share measurement window ambiguity] → "equilibrium" is defined as the final 600 ticks of the opening run; recorded here.

## Open blocker (discovered while authoring the corpus)

The strategy corpus cannot be completed against the R3 content as it stands: **the seeded buildable mask is unusable for the R3 footprints.**

`buildableMask` (packages/core/src/sim/spatial.ts) shuffles all `width × height` cells with the `spatial.buildable.<entity>` stream and blocks the first `(1 − ratio)` of them. That is uniform white noise, so the chance that a given cell is free is `ratio`, and a `w × h` footprint needs `ratio^(w·h)` of the grid. At the specified 400–700 permille range a 3×3 residence needs 4 %–0.4 % of positions, and a 4×4 hub 1.5 %–0.02 %.

A probe over 24 seeds (40×40, R3 content) found:

| Buildable permille | Seeds | Largest free square |
|---|---|---|
| 402–496 | 11 | 2–3 |
| 522–584 | 6 | 3 |
| 610–697 | 7 | 3–5 |

None of the 24 seeds admits the 15 S1 residences (3×3 each) the opening needs, and the two seeds at 688/636 permille admit a single 4×4 at best. Placement is therefore impossible regardless of balance.

GDD 6.1 intends 40–70 % buildable *terrain*, i.e. contiguous buildable areas with obstacles, not an uncorrelated per-cell coin flip. Fixing the generator (correlated/clustered mask) is a framework change with hash consequences, and this change's Impact section excludes `core`. Two directions:

1. **Framework fix (recommended).** Make `buildableMask` produce clustered blocked regions (e.g. seeded blobs/corridors whose area matches the ratio), bump the algorithm version tag, and regenerate the goldens of the grid scenarios with an explained hash change (06 §9.4). This makes every seed playable and keeps "seeded generation" honest. It needs an amendment to this change (Impact: `core`) or its own small change row, because it is a versioned algorithm.
2. **Content workaround.** Author `spatial_parameters.blocked_cells` for the six R3 locations (the loader supports it), leaving the ratio path for fixtures. No core or hash change, but the R3 world stops using seeded masks, which weakens 8.1 and makes a 1,600-cell table the source of terrain.

Whichever is chosen, the corpus tasks (3.1–3.4) stay blocked until the terrain admits the archetype footprints; everything upstream of placement (expectations, metrics, CSV) is complete and tested.

## Migration Plan

- Additive runner report fields and CLI flag; no existing scenario or golden changes (existing scenarios have no `expect` entries). Rollback = revert.
