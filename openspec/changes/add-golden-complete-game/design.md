# Design

## Context

See proposal.md "Why". Golden scenarios follow the shipped pattern: a YAML scenario in the reference test tree, a committed `.hashes.json`, and a host-node driver test (`loss-spiral.test.ts`, `exchange-loop.test.ts`). The planning read model computes exact rationals with floored display (4.5); the framework half of SCN-18 ran on a demo fixture there. 11.2 provides expectation evaluation and metrics rows; 11.1 fixes the start state the strategy pins.

## Goals / Non-Goals

**Goals:**

- SCN-14 and SCN-18 (reference half) as specified by 06 §9.3, deterministic and golden-anchored.
- Harness coverage that makes the 7,200-tick run trustworthy without bloating CI.

**Non-Goals:**

- Browser/WebKit replay of SCN-14 (12.7 full matrix); R4 re-runs (11.5/12.7); scenario-format changes.

## Decisions

### D1. Hash checkpoints every 600 ticks

`run.hash_interval: 600` yields 12 checkpoints (plus final) — enough to localize divergence, small enough to review, unlike the per-tick hashes of the ≤ 600-tick fixtures. Invariants still run every tick (`run.invariants: all`), which is the stronger check; the double-run and save-continue harnesses compare all checkpoints. Recorded here because the shipped fixtures used `hash_interval: 1`.

### D2. SCN-14 reuses the opening strategy verbatim

The scenario's `commands` are 11.2's opening strategy commands, with the run horizon extended to 7,200 ticks and SCN-14's expectations appended. One strategy corpus, no fork. Expectations: `event_count` of the S1→S2 transition `greater: 0` at tick 1500 (the strategy reaches it inside 11.2's window) and `population` of S2 `greater_equal: 1` at tick 7200.

### D3. Save-continue at the midpoint

Tick 3600 (post-advancement, mid-logistics) exercises persistence across the interesting state changes; the driver saves via the session save API, reloads into a fresh session, and continues — the same harness the testkit provides.

### D4. SCN-18 builds content, not a hand-built world

The chain (2 area extractors, 2 refiners, 1 slot extractor, 1 combiner) is placed on a derived world from the R3 definitions through the normal placement path, then the `planning` read model is queried with each tier's demand. The expected 200/133 comes from 01 Appendix B.3 via the 6000-scale conversions of 07 §4 — if the read model disagrees, that is a defect in content conversions (or, worse, in the read model), to be raised, not tuned away.

### D5. Driver and placement

As built, the driver lives in `reference/content/test/scenarios/complete-game.test.ts`, not in `packages/host-node`: framework packages and their tests must stay theme-free (the `theme-free` lint rule rejects the `ref.tier` identifiers), so the reference test drives the pure scenario runner instead of the CLI. Everything the CLI adds is already covered by the runner tests.

`packages/host-node/src/complete-game.test.ts` drives the scenario (pattern: `logistics-loop.test.ts`); the SCN-18 test lives beside it or in `reference/content/test` per the shipped split (scenario data in the reference tree, drivers in host-node) — kept consistent with 06 §9.3's "SCN-14 and the reference half of SCN-18 live in `reference/content/test`".

## Risks / Trade-offs

- [7,200 ticks × invariants is the slowest test in the repo] → **measured: 4 min 39 s per run.** The full-length run is therefore gated: CI runs an 1,800-tick prefix of the same scenario and compares the 600/1,200/1,800 golden checkpoints, and `AESFW_SLOW=1` restores the complete 7,200-tick run with the full expectation set. This is the deviation the design anticipated, not a silent cut; the golden still records all twelve checkpoints from the full run.
- [Strategy drift if 11.2 retunes content] → this change lands after 11.2 archives; any later retune re-runs SCN-14 in its own change with an explained golden update (06 §9.4).

## Findings

### D6 (deviation). Save-continue and clone-run at tick 1,200, not 3,600

The per-tick invariant harness deep-clones the world every tick, so a 3,600-tick run costs about 2 min 20 s and doing it three times (straight, midpoint, continuation) dwarfs the rest of the suite. The harnesses run at tick 1,200 instead — after the first S1→S2 advancement (measured at ~900), which is the interesting state transition — and continue 300 ticks. The full-length golden run still covers the whole horizon.

### D7 (defect found). Planning per-capita demand scaled with the residence count

SCN-18's first run reported 100 supported S1 instead of 200: `buildScope` summed each residence's `quantityPerPopulationPerTick × factor` across every residence of the tier, so two S1 residences doubled the per-capita demand. Per-capita demand is a property of the tier, not of the house count; the read model now takes the first residence row (ascending entity ID). A unit test pins it. This is a defect in the 4.5 read model, independent of the reference content.

### D8. Data. SCN-14 numbers

- 7,200 ticks, invariants every tick, 12 checkpoints at `hash_interval: 600`.
- First `TransitionStarted` at tick 879; the expectation at tick 1,500 sees it (`greater: 0`).
- Final S2 population 20 at tick 7,200 (`greater_equal: 1`).
- No findings across the full run.
- SCN-18: 200 C1 per tick; supported population 200 S1 / 133 S2.

### D9. Traceability

`tools/trace/exempt.yaml` had no SCN-14 or SCN-18 entries to remove; both IDs were already extracted but untraced, and the new `[SCN-14]`/`[SCN-18]` test tags make them traced (0 untraced under `--strict`).

## Migration Plan

- Additive: new scenario, golden, and tests; two trace exemptions removed. Rollback = revert (exemptions restored).
