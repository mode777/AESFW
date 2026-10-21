# host/cli Specification

## Purpose

The scenario format of VER-9.1 and the pure runner that executes it against compiled content, plus the `aesfw validate` and `aesfw run` commands of TDS-21.2 (VER-9.1, VER-9.2, TDS-21.2).

## Requirements

### Requirement: Scenario format
A scenario SHALL carry its id, requirement tags, content package paths, setup (seed, tick duration, world), commands, run settings (ticks, hash interval, invariants), an optional golden path, and optional expectations. `parseScenario(value)` SHALL return a `Scenario` or a list of errors for a malformed value, never throwing for expected malformed input.

Source: VER-9.1

#### Scenario: A well-formed scenario parses
- **WHEN** a scenario object with an id, setup, and run settings is parsed
- **THEN** the result is the scenario with those values

#### Scenario: A malformed scenario reports errors
- **WHEN** a scenario object is missing its id
- **THEN** parsing returns errors and no scenario

### Requirement: Pure scenario runner
`runScenario(scenario, content)` SHALL create a world from the compiled content, instantiate the default world plan, run `run.ticks` ticks, and, when `run.invariants` is true, check the invariant catalogue after every tick. When `run.hashInterval` is greater than zero it SHALL record a `(tick, hash)` checkpoint every interval. It SHALL return a report carrying the checkpoints, the events, and any invariant findings, and SHALL NOT perform I/O.

Source: VER-9.2, VER-6

#### Scenario: A scenario runs and records checkpoints
- **WHEN** a scenario with `ticks: 10` and `hashInterval: 5` runs on valid content
- **THEN** the report has checkpoints at ticks `5` and `10` and no invariant findings

#### Scenario: An invariant violation is reported
- **WHEN** a tick leaves the world in a state that violates an invariant
- **THEN** the report contains a finding with that invariant id and tick

#### Scenario: The same scenario runs deterministically
- **WHEN** the same scenario runs twice on the same content
- **THEN** both reports have identical checkpoints

### Requirement: CLI validate
`aesfw validate <package-dir…> [--strict] [--format text|json]` SHALL load the given packages through `loadContent` and print their diagnostics in the requested format, exiting non-zero when an error-severity diagnostic is present.

Source: TDS-21.2, CONT-15

#### Scenario: A valid package exits zero
- **WHEN** `aesfw validate` runs on a valid package directory
- **THEN** it prints no error diagnostics and exits `0`

#### Scenario: An invalid package exits non-zero
- **WHEN** `aesfw validate` runs on a package with an unresolved reference
- **THEN** it prints the diagnostic and exits non-zero

### Requirement: CLI run
`aesfw run <scenario.yaml> [--ticks N] [--hash-interval N]` SHALL parse the scenario, load its content packages, run it through the pure runner, and print the report; `--ticks` and `--hash-interval` SHALL override the scenario's run settings.

Source: TDS-21.2, VER-9.2

#### Scenario: A scenario runs from the CLI
- **WHEN** `aesfw run` runs on a valid scenario
- **THEN** it prints the checkpoints and exits `0`

#### Scenario: Ticks override the scenario
- **WHEN** `aesfw run --ticks 5` runs on a scenario declaring `ticks: 100`
- **THEN** the report has a checkpoint for tick `5` and none beyond it
