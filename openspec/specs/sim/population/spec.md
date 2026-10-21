# sim/population Specification

## Purpose

Residences and their aggregate population groups, the world-resident rate accumulators of TDS-6.4, and the capability outputs of phase 26 that let population feed the capability pools of the next tick (GDD-11.1–11.3, TDS-6.4).

## Requirements

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

### Requirement: Growth policy state
A `growth` component SHALL carry the policy handle, its interval in ticks, an optional increase step, and an optional decrease step. A step SHALL carry a non-negative quantity and a condition over satisfaction and available capacity.

Source: GDD-11.4, CONT-6.14

#### Scenario: A growth policy carries its steps
- **WHEN** a growth policy with interval `10`, an increase step of `1`, and a decrease step of `1` is created
- **THEN** reading it returns the interval and both steps

### Requirement: Growth condition
A step condition SHALL be satisfied when residence satisfaction is at least its minimum, below its maximum, and (when required) the population is below capacity. A missing minimum or maximum SHALL not constrain the condition.

Source: GDD-11.4

#### Scenario: A satisfied condition admits growth
- **WHEN** satisfaction is `900`, the minimum is `800`, and capacity is available
- **THEN** the increase condition is satisfied

#### Scenario: A low satisfaction satisfies the decline condition
- **WHEN** satisfaction is `200` and the decrease maximum is `250`
- **THEN** the decrease condition is satisfied

#### Scenario: A full residence does not grow
- **WHEN** the population equals capacity and the condition requires available capacity
- **THEN** the increase condition is not satisfied

### Requirement: Population update
Phase 23 SHALL, for each residence in ascending entity ID, evaluate the increase step then the decrease step, accumulate the step quantity over the interval, and apply the whole accumulated amount: increase the population toward capacity or decrease it toward `0`. It SHALL clamp the population to `[0, capacity]` and emit `PopulationChanged` when the count changes.

Source: GDD-11.4, INV-07

#### Scenario: A satisfied residence grows
- **WHEN** an increase step of `1` with interval `1` and a satisfied condition runs
- **THEN** the population increases by `1`

#### Scenario: A decline shrinks the residence
- **WHEN** a decrease step of `1` with interval `1` and a satisfied condition runs
- **THEN** the population decreases by `1`

#### Scenario: Growth is capped at capacity
- **WHEN** the population is `10`, capacity is `10`, and growth would increase it
- **THEN** the population stays `10`

#### Scenario: Decline stops at zero
- **WHEN** the population is `0` and decline would decrease it
- **THEN** the population stays `0`

#### Scenario: The interval spreads the change
- **WHEN** an increase step of `1` has interval `10` and its condition is satisfied for `10` ticks
- **THEN** the population increases once over those ticks

### Requirement: Population stays within bounds
Every population group SHALL have `0 ≤ count ≤ capacity` (INV-07).

Source: INV-07, GDD-11

#### Scenario: A population above capacity is reported
- **WHEN** a population group has a count above its capacity
- **THEN** the findings contain INV-07
