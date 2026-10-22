# Design — add-benchmark-harness

## Context

`add-scenario-runner-and-cli` (1.14) is archived: the scenario model, the pure runner, the content entity instantiation, and the CLI exist. TDS-24 fixes the budgets and VER-14 fixes the reported statistics. This document records the clock boundary and the command.

## Goals / Non-Goals

**Goals:** the pure benchmark runner, the `bench.small` scenario, the `aesfw bench` command, JSON results, and the nightly step.

**Non-Goals:** `bench.reference`/`bench.large` (M6/M12), the rolling-baseline comparison and regression gate (M12), browser frame-time budgets (07 §14.6).

## Decisions

### D1 — Module layout

`packages/testkit/src/bench/` holds `types.ts`, `runner.ts`, and `index.ts`, exported as `@aesfw/testkit/bench`. `packages/host-node/src/cli.ts` gains the `bench` command.

### D2 — Injected clock

`runBenchmark(scenario, content, { iterations, warmup, now })` takes `now: () => number`; the pure testkit never reads a clock itself (05 §5.3). The host passes `performance.now`. This keeps the runner pure and testable with a deterministic fake clock.

### D3 — World creation and statistics

The runner reuses the scenario world creation (default world plan plus `instantiateContentEntities`). It runs `warmup` untimed ticks, then `iterations` ticks timing each. The median is the middle of the ascending sample; the p95 is the nearest-rank 95th percentile. The entity count is the sum of the live store sizes. Hashing and invariants are off.

### D4 — Scenario and CLI

`fixtures/scenarios/bench_small.yaml` uses the basic-loop fixture with `hash_interval: 0` and `invariants: false`. `aesfw bench` loads the scenario (default `bench_small`), resolves its content, calls the runner with `performance.now`, and prints the JSON result.

### D5 — Nightly

`.github/workflows/nightly.yml` gains a step that runs `pnpm bench` and uploads or stores the JSON results. The comparison and gate stay non-blocking until M12.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [bench.small uses the small basic-loop fixture] → TDS-24's ≈200-entity composition arrives with richer content; the harness and budget are in place.
- [Wall-clock timing is noisy] → median and p95 over many iterations, with a warm-up, reduce noise; the trend gate is non-blocking until M12.

## Migration Plan

Additive testkit module, CLI command, scenario, and CI step. No goldens or saves exist. Rollback is reverting the change.

## Open Questions

None blocking.
