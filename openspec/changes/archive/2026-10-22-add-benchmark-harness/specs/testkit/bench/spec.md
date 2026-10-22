# Spec Delta

## Purpose

The performance harness: a pure benchmark runner over a scenario, the `bench.small` scenario, the `aesfw bench` command with JSON results, and the nightly trend step (TDS-24, VER-14).

## ADDED Requirements

### Requirement: Pure benchmark runner
`runBenchmark(scenario, content, options)` SHALL create the scenario world, run `options.warmup` ticks untimed, then run `options.iterations` ticks timing each with the injected `options.now` clock, and SHALL return the scenario id, the live entity count, the iteration count, and the median and p95 tick times. It SHALL use no clock of its own and SHALL NOT be affected by hashing or invariants.

Source: TDS-24, VER-14

#### Scenario: The runner reports the median and p95
- **WHEN** the runner times `100` ticks with an injected clock
- **THEN** it returns `iterations: 100`, an entity count, and median and p95 values

#### Scenario: The warm-up is not timed
- **WHEN** the runner is given a warm-up of `10` ticks
- **THEN** only the timed iterations contribute to the median and p95

### Requirement: Bench scenario
`fixtures/scenarios/bench_small.yaml` SHALL define the `bench.small` scenario over the basic-loop fixture with no hashing and no invariants, so it measures tick cost only.

Source: TDS-24, VER-14

#### Scenario: bench.small runs
- **WHEN** the bench scenario runs through the runner
- **THEN** it completes and reports a tick time

### Requirement: Benchmark CLI command
`aesfw bench [--scenario name] [--iterations N] [--warmup N]` SHALL run the named scenario through the pure runner and print a JSON result carrying the scenario, entity count, iterations, and median and p95 tick times.

Source: TDS-21.2, VER-14

#### Scenario: The command prints JSON
- **WHEN** `aesfw bench --scenario bench.small` runs
- **THEN** it prints a JSON object with `scenario`, `entities`, `iterations`, `medianMs`, and `p95Ms`

### Requirement: Nightly trend step
The nightly workflow SHALL run `pnpm bench` and store its JSON results for trend comparison. The comparison and the 20 % regression gate SHALL remain non-blocking until M12.

Source: VER-14, TDS-24

#### Scenario: The nightly job runs the benchmark
- **WHEN** the nightly workflow runs
- **THEN** it executes `pnpm bench` and stores the results
