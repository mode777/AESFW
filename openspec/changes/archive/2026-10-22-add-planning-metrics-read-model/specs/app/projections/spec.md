# Spec Delta

## Purpose

The planning metrics read model (PIC-10.5): supported population per resource and tier, and chain metrics with integer stage ratios (GDD-3.8, GDD-10.6, TDS-18.5).

## ADDED Requirements

### Requirement: Planning net rate
`planningMetrics(session, actor)` SHALL compute, for every resource consumed by a `resource_consumption` need and for the owner scope and each location scope, the nominal net production rate as an exact rational: the sum over the scope's producers of their selected recipe's per-tick output of the resource minus the per-tick inputs of the resource, where a batch recipe's per-tick rate is `quantity / duration_ticks` and a continuous recipe's rate is `quantity` per tick. The read model SHALL report the floored per-tick value.

Source: PIC-10.5, TDS-18.5, GDD-10.6

#### Scenario: The net rate nets outputs against recipe inputs
- **WHEN** two producers each output `30` of `test.r.ore` per `10` ticks and two refiners each consume `20` ore per `10` ticks
- **THEN** the owner-scope net rate for `test.r.ore` is `2` per tick

#### Scenario: A continuous recipe contributes its quantity per tick
- **WHEN** a continuous producer outputs `7` of `test.r.ore` per tick
- **THEN** the owner-scope net rate for `test.r.ore` includes `7` per tick

### Requirement: Supported population per tier
For each consuming tier, the read model SHALL report the per-capita demand — the sum of the tier's need quantities for the resource multiplied by the tier's consumption factor over `1000`, as an exact rational — and the supported population as `floor(net_rate / per_capita)`, clamped to at least `0`. It SHALL also report the tier's current consuming population and a coverage ratio of `floor(population × 1000 / supported)` permille (`0` when supported is `0`).

Source: PIC-10.5, TDS-18.5, GDD-3.8

#### Scenario: Supported population matches the hand calculation
- **WHEN** the net rate of `test.r.metal` is `2` per tick and a tier with consumption factor `1000` consumes `2` per population per tick
- **THEN** the supported population for that tier is `1`

#### Scenario: A negative net rate supports nobody
- **WHEN** the net rate of a resource is negative for a scope
- **THEN** the supported population is `0` for every consuming tier

#### Scenario: The coverage ratio reports over-coverage in permille
- **WHEN** a tier's consuming population is `5` and its supported population is `1`
- **THEN** the coverage ratio is `5000` permille

### Requirement: Chain metrics
For every resource that at least one producer outputs, the read model SHALL report a chain with the producers whose selected recipe outputs or consumes the resource, grouped by entity definition as stages. Each stage SHALL carry the entity count, its ratio relative to the greatest common divisor of the stage counts, the stage's total per-tick output of the chain resource, the stage's total footprint cells, its total per-interval maintenance, and its capability demand. The chain SHALL carry the resource and the total per-tick output of the resource.

Source: PIC-10.5, GDD-10.6

#### Scenario: Chain stages carry counts and integer ratios
- **WHEN** a chain for `test.r.ore` has two extractors and two refiners
- **THEN** the stages report counts `2` and `2` with ratios `1` and `1`

#### Scenario: Stage demand aggregates capability and maintenance
- **WHEN** each of two refiners requires `1` of a capability and pays `100` maintenance per interval
- **THEN** the refiner stage's capability demand is `1` for the capability and its maintenance is `200` per interval

### Requirement: Planning codec
`decodePlanning(value)` SHALL accept the `PlanningDto` shape and return the typed value, rejecting a missing required scalar field with `protocol.invalid_field`.

Source: PIC-10.5, TDS-22

#### Scenario: A planning read model decodes
- **WHEN** a valid planning DTO is decoded
- **THEN** the result is ok and carries the decoded tiers

#### Scenario: A planning DTO without a scope is rejected
- **WHEN** a planning scope entry lacks `scope`
- **THEN** the result reports `protocol.invalid_field`
