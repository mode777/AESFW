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

4. **Authored initial entities had no spatial transform.** `initial_entities` carried only a definition and a location, and instantiation wrote no `transform`/`footprint`. Connectivity is transform-based, so every authored entity with `connectivity.requires` was permanently disconnected and blocked with `missing_inventory_access` — in the R3 start state the whole chain was dead. Fixed with **option A**: `worlds[].owners[].initial_entities` accepts an optional `position` and `orientation`, `worldPlan` reserves those footprint cells so the seeded mask can never block them, and `instantiateWorldContent` places the entity through `framework.spatial.grid` exactly like a command. Content now authors the start layout (which 11.4b/11.4c also need).

5. **Capability grants exceeded supply during decline.** INV-05 fired from the first decline tick (`grants 80 above supply 78`). The provider rates are published in phase 26, after phase 23 changes the population, so the end-of-tick rates are below the pool phase 06 allocated against. Fixed by publishing the phase-05 pools as the tick metric `capability_supply` and having the invariant use it; the provider rates remain the fallback for hand-built outputs. The allocation was correct all along — the check was comparing against the wrong snapshot.

6. **Disabled entities diluted the capability pool.** `allocateCapabilities` counted every consumer, including entities the player disabled or the deficit policy paused, so a player could not free capability by switching a building off: five refiners requesting 20 each against 80 AK1 all received 16 and all blocked with `missing_capability`, which made the opening impossible. Consumers that are not operating are now excluded from allocation (GDD-9.1, GDD-20.3).

### Balance findings (measured, not yet resolved)

With defects 1–6 fixed the opening runs with no findings, no rejected commands, and a connected start chain. It still does not reach the first advancement. The measurements:

- **Producers ran far below their recipe arithmetic; fixed.** A batch start requested its whole input plus output movement (18,000) on one tick against a 6,000–8,000/tick hub pool, so `alloc-v1` throttled it and a 30-tick recipe completed at about a seventh of its rating. Batches are now paced per tick (05 §26 A16), which the design records as the chosen semantics. With pacing, the opening reaches 150 S1 at tick 360 instead of never. The remaining gap to the first advancement is strategy scheduling, not mechanics: the plan must enable H1 and BM2 production early enough to bank 6 BM2 for the S1→S2 cost.
- **Income is an order of magnitude too low.** At 120 S1 population the owner nets about `−15,700` base units per tick (1,200 revenue against ~16,900 maintenance). Appendix B.4's `0.10` per population per minute cannot pay B.3's maintenance; a 10× retune brought the same state to `−2,000` and to break-even at ~140 S1, which is the right order for a chain that must pay for itself. Appendix B is non-normative example content, so this is a legitimate retune, but it was reverted rather than shipped unvalidated.
- **The start stock and the unlock order do not close yet.** With 60 BM1 the opening reaches 150 S1 by tick 360 and holds it, but the 60,000-base-unit C1 stock is exhausted around tick 650 (150 pop consume 150 per tick), while the combiner that would replenish C1 is gated on 25 AK2 from the first S2 residents — which need the advancement. The measured deltas that work are a 10× income retune (net `+1,000` at 150 S1 instead of `−12,500`) and a 150,000 C1 stock (runway past tick 1,140), plus enough BM1 to start with ten residences. These were reverted pending the strategy schedule, then become the 3.4 retune.

## Golden impact

Three goldens change, all intended and explained here per 06 §9.4; no versioned algorithm changes, so the algorithm tag is unchanged.

- `fixtures/scenarios/loss_spiral.hashes.json` (SCN-04): defect 6 makes deficit-paused and disabled entities stop requesting capability, so the paused producer no longer competes for the pool.
- `fixtures/scenarios/logistics_loop.hashes.json` (SCN-02) and `fixtures/scenarios/throughput_throttling.hashes.json` (SCN-10): a batch producer now requests its movement per tick instead of the whole batch on its completion tick, so grants, throttles, and therefore the hashes change. The throttling scenario still throttles; it now does so on the sustained rate.

No other scenario contains a capability consumer or a placement, and no grid location appears in any golden.

## Migration Plan

- Additive runner report fields and CLI flag; existing scenarios have no `expect` entries, so their reports only gain empty `expectations`/`metrics` arrays. The one golden change is explained above. Rollback = revert.
