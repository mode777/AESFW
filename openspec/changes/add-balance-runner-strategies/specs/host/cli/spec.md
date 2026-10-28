# Spec Delta

## MODIFIED Requirements

### Requirement: CLI run
`aesfw run <scenario>` SHALL execute a scenario through the pure runner, print the run report including expectation results, and support `--metrics-out <file>` to write the metrics rows as CSV. It SHALL exit non-zero when the scenario fails invariants or expectations.

Source: TDS-21.2, VER-9.2, REF-8

#### Scenario: A passing run exits zero
- **WHEN** `aesfw run` executes a scenario whose invariants and expectations hold
- **THEN** it exits `0`, prints the checkpoints and the expectation results

#### Scenario: A failing expectation exits non-zero
- **WHEN** `aesfw run` executes a scenario with a failing expectation
- **THEN** it exits non-zero and names the failed entry

#### Scenario: A scenario runs from the CLI
- **WHEN** `aesfw run` runs on a valid scenario
- **THEN** it prints the checkpoints and exits `0`

#### Scenario: Ticks override the scenario
- **WHEN** `aesfw run --ticks 5` runs on a scenario declaring `ticks: 100`
- **THEN** the report has a checkpoint for tick `5` and none beyond it

#### Scenario: Metrics are exported on request
- **WHEN** `aesfw run` is invoked with `--metrics-out metrics.csv`
- **THEN** the CSV file contains one row per metrics checkpoint
