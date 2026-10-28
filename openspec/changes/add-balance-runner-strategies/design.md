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

The strategy corpus cannot run end to end against the R3 content. Authoring the opening exposed a chain of real framework defects; the first three are fixed in this change, the last two are open and block tasks 3.1–3.4.

### Fixed in this change

1. **The seeded buildable mask was unusable.** `buildableMask` shuffled all cells and blocked the first `(1 − ratio)`, i.e. an uncorrelated per-cell coin flip. A `w × h` footprint then needs `ratio^(w·h)` of positions: at 400–700 permille a 3×3 residence fits on 4 %–0.4 % of positions and a 4×4 hub on 1.5 %–0.02 %. A probe over 24 seeds found no seed that admits the 15 residences the opening needs. The generator now draws a coarse seeded value field, smooths it over 3×3 blocks, and blocks the highest-value cells (ratio still honoured exactly, ties broken by the seeded permutation). All 24 probed seeds now admit ≥ 10×10 and hundreds of free 3×3/4×4 positions, and a core regression test pins that. No golden contained a grid location, so no hash changed.
2. **Constructed entities were inert shells.** Phase 01 allocated an entity and wrote definition, owner, placement, enabled, and lifecycle, but never the producer, residence, source, service, connectivity, cargo, or maintenance components — only authored entities got those through `@aesfw/app`. A player-built refiner could never produce. This is now the `EntityMaterializer` seam (05 §26 A15): phase 01 materializes a placement that needs no construction, phase 03 materializes a constructed entity when it becomes `active`. `@aesfw/app` implements it with the same component writer as authored entities, and an app test covers a placed refiner gaining its producer component on completion.
3. **Placement left the derived caches stale.** `applyPlaceEntityPlan` did not mark `world.caches.dirty`, so a new connectivity provider or requirement never entered the connectivity groups (phase 04 only rebuilds a dirty cache). Every placed networked building stayed `missing_inventory_access` forever. Placement now dirties the caches.

### Open

4. **Authored initial entities have no spatial transform.** `initial_entities` in world content carries only a definition and a location, and `instantiateDefinition` writes no `transform`/`footprint`. Connectivity is transform-based (`collectNodes` only sees entities with a transform), so every authored entity that carries `connectivity.requires` is permanently disconnected and blocked with `missing_inventory_access`. In the R3 start state that is the hub, both area extractors, the slot extractor, and the refiners: the whole start chain is dead, which is why population stalls at the 20 beds of the two residences and C1 stock never refills. This needs a decision:
   - **Option A (recommended).** Add an optional `position`/`orientation` to `worlds[].owners[].initial_entities` and place authored entities through the grid policy, exactly like a command. Content then authors the start layout (which 11.4b/11.4c also want for the client) and the schema change is additive.
   - **Option B.** Auto-place authored entities at the first free cell, row-major, at instantiation. No schema change, but content cannot author the start layout and the client must not depend on it.
   Neither option is in 11.2's stated scope; both are framework changes with content-side effects.
5. **Capability grants exceed supply during decline.** With population falling (emigration after a C1 stock-out) the tick invariant INV-05 fires from the decline onward: `capability pool location:1:0 grants 80 above supply 78`, then a chain of off-by-larger values. Phase 05 rebuilds supply from the *previous* tick's population, phase 06 allocates against it, and phase 23 changes the population later in the same tick, so the grant lags the supply by one tick. The invariant should compare against the supply the allocation used, or the allocation should follow the population update. This is a real engine defect, independent of content, and it must be fixed before SCN-14 (11.3) can run with `invariants: true`.

### Balance findings (provisional, unvalidated)

With the fixes above but before a playable start state exists, the numbers show two further problems that task 3.4 must address:

- **Income is an order of magnitude too low.** At 20 S1 population the owner nets about `−9,300` base units per tick: 20 × 10 = 200 revenue against roughly 9,500 of `while_enabled` maintenance (hub 20/min, transport 25/min, two area extractors 12/min, two refiners 30/min, slot extractor 8/min). The 30,000,000 credit start stock only delays insolvency to about tick 3,200. Appendix B.4's `0.10` per population per minute cannot pay B.3's maintenance; about `1.0` per minute (100 base units per tick) makes 150 S1 break even against the chain that supports them. Appendix B is non-normative example content, so this is a legitimate retune, but it must be measured against the targets before it is committed — the numbers were reverted to 11.1's values rather than shipped unvalidated.
- **The C1 start stock and the unlock order do not close.** The only C1 producer is the combiner, unlock-gated at 150 S1; reaching 150 S1 needs 13 more residences, which need 78 BM1 against a 40-unit start stock and a BM1 chain that itself needs AK1 from those residences. On top of that, 150 S1 consume 60,000 base units of C1 in about 750 ticks, exactly the start stock, so the population starves before the first advancement can complete. Once the start state is playable these numbers need a measured retune (higher C1 stock, and either an earlier combiner unlock or a cheaper first residence).

## Migration Plan

- Additive runner report fields and CLI flag; no existing scenario or golden changes (existing scenarios have no `expect` entries). Rollback = revert.
