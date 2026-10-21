# Spec Delta

## Purpose

Population growth and decline: the resolved growth policy, phase 23 evaluation of satisfaction and capacity conditions, fraction accumulation across the interval, and the population bound of INV-07 (GDD-11.4, CONT-6.14).

## ADDED Requirements

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
