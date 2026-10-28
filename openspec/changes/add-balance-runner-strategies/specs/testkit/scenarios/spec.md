# Spec Delta

## ADDED Requirements

### Requirement: Scenario expectation evaluation
The scenario runner SHALL evaluate every `expect` entry of VER-9.1 at its `at` tick: a `metric` expectation SHALL resolve `population` (by tier, per location or world) and `satisfaction` (per residence entity reference) from the world and read models, and an `event_count` expectation SHALL count emitted events of the type since the run start. Each entry SHALL produce a pass or fail result with the observed value, compared by `greater`, `greater_equal`, `less`, `less_equal`, or `equal`. A scenario with a failing expectation SHALL report failure while the run itself continues deterministically.

Source: VER-9.1, VER-9.2

#### Scenario: A satisfied population expectation passes
- **WHEN** a scenario expects `population` of tier `demo.population.tier_1` `greater_equal: 2` at tick `49` and the world holds 3
- **THEN** the report marks the entry passed with observed `3`

#### Scenario: An unsatisfied expectation fails the scenario
- **WHEN** a scenario expects `satisfaction` `greater_equal: 800` at tick `600` and the residence reads `400`
- **THEN** the report marks the entry failed with observed `400` and the scenario fails

#### Scenario: Event counts accumulate over the run
- **WHEN** a scenario expects `event_count` of `ProductionBlocked` with reason `entity_disabled` `greater: 0` at tick `79` and two such events were emitted at ticks `50` and `60`
- **THEN** the report marks the entry passed with observed `2`

### Requirement: Metrics rows from scenario runs
The scenario runner SHALL produce, for every metrics checkpoint tick, a data row carrying the tick, population by tier, the owner balance and net rate, per-residence satisfaction, and the traded volume per exchange, as plain data returned by the pure runner. Row assembly SHALL read only world state, read models, and the event log.

Source: REF-8, VER-9.2

#### Scenario: Metrics rows cover the balancing fields
- **WHEN** a strategy scenario runs with a metrics checkpoint every 60 ticks for 600 ticks
- **THEN** the runner returns 10 rows whose first row carries the tick and the owner balance at that tick

#### Scenario: Metrics rows are deterministic
- **WHEN** the same scenario runs twice
- **THEN** the metrics rows are identical
