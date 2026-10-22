# Proposal

## Why

Roadmap 08, M1 item 1.16 (`add-benchmark-harness`, capability `testkit/bench`, size S). M1's exit criteria include a recorded `bench.small` baseline, and R-06 (the TypeScript simulation too slow for browser play) is tracked by a benchmark harness from M1. This row delivers the pure benchmark runner, the `bench.small` scenario, the `aesfw bench` command, JSON results, and the nightly trend step. Depends on: `add-scenario-runner-and-cli` (1.14) — archived 2026-10-21.

## What Changes

- Add `@aesfw/testkit/bench`: a pure `runBenchmark(scenario, content, options)` that warms up, times `iterations` ticks with an injected clock, and returns the median and p95 tick time plus the entity count.
- Add the `bench.small` scenario over the basic-loop fixture.
- Add `aesfw bench [--scenario name] [--iterations N] [--warmup N]`, writing JSON results.
- Add the `pnpm bench` script and the nightly benchmark-trend step.
- Add unit tests for the runner and the CLI command.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `testkit/bench`: the pure benchmark runner and the `bench.small` scenario.

## Impact

- **Packages:** `@aesfw/testkit` gains `src/bench/**` and a `./bench` export; `@aesfw/host-node` gains the `bench` command; the root gains a `pnpm bench` script; `fixtures/scenarios/bench_small.yaml` is new; `.github/workflows/nightly.yml` gains the trend step. No pure-package dependency is added (the clock is injected).
- **Tick phases:** none. **Commands:** none. **Budgets:** TDS-24 `bench.small` ≤ 0.5 ms is recorded; richer ≈200-entity content arrives with later milestones.
- **Out of scope:** `bench.reference` and `bench.large` (M6/M12), the rolling-baseline comparison and 20 % regression gate (M12), browser frame-time budgets (07 §14.6).
- **Verification impact:** `pnpm test` gains benchmark runner and CLI tests.
