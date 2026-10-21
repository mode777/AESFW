# Spec Delta

## Purpose

Residences and their aggregate population groups, the world-resident rate accumulators of TDS-6.4, and the capability outputs of phase 26 that let population feed the capability pools of the next tick (GDD-11.1–11.3, TDS-6.4).

## ADDED Requirements

### Requirement: Residence and population group state
A `residence` SHALL carry its tier handle, its capacity, its location, its growth-policy handle, its consumption factor, and its resolved outputs. A `populationGroup` SHALL carry its tier handle, its current count, and its capacity.

Source: GDD-11.1, GDD-11.2

#### Scenario: A residence carries its group and outputs
- **WHEN** a residence with capacity `10`, a population count of `4`, and one capability output is created
- **THEN** reading it returns the tier, capacity, count, and output

### Requirement: Rate accumulators
The world SHALL hold rate accumulators keyed by `(subject, purpose, resource)` with a carry in `[0, 1000)`. Advancing one tick SHALL compute `amount = floor((base_rate × multiplier_permille + carry) / 1000)` and store the new carry, so a recurring fractional rate is delivered exactly over time (TDS-6.4).

Source: TDS-6.4

#### Scenario: A carry accumulates across ticks
- **WHEN** an accumulator with carry `900` receives a base rate that yields a remainder of `100` for two consecutive ticks
- **THEN** the first tick delivers the whole part and the second delivers the accumulated unit

### Requirement: Population capability outputs
Phase 26 SHALL, for each residence in ascending entity ID, for each capability output, compute `count × rate_per_population_per_tick`, advance the accumulator for `(residence, population_need, resource)`, and publish a `capabilityProvider` on the residence carrying the accumulated amount, the output's scope, and the residence's location for location scope. A residence with zero population SHALL produce nothing.

Source: GDD-11.3, ARCH-13

#### Scenario: A residence produces its capability
- **WHEN** a residence with count `4` and rate `1` advances phase 26
- **THEN** its `capabilityProvider` carries rate `4`

#### Scenario: Zero population produces nothing
- **WHEN** a residence with count `0` advances phase 26
- **THEN** its `capabilityProvider` carries rate `0`

#### Scenario: Accumulated output is published
- **WHEN** two consecutive phase 26 runs leave a carry of `500`, then the next run produces a whole extra unit
- **THEN** the published rate reflects the accumulated amount
