# Spec Delta

## Purpose

Phase 26 applies every resolved tier output: capability outputs feed the capability pools (unchanged rule, generalized past `outputs[0]`), resource outputs are owner income per the owner balance model (sim/economy).

## MODIFIED Requirements

### Requirement: Population capability outputs
Phase 26 SHALL, for each residence in ascending entity ID, publish a `capabilityProvider` from the residence's first output whose resource has recomputed storage, computing `count × rate_per_population_per_tick`, advancing the accumulator for `(residence, population_need, resource)`, and carrying the output's scope and the residence's location for location scope. A residence with zero population SHALL publish nothing. Outputs whose resource has normal storage are owner income and are governed by the owner balance model; they SHALL NOT displace the published capability.

Source: GDD-11.3, ARCH-13

#### Scenario: A residence produces its capability
- **WHEN** a residence with count `4`, a capability output of rate `1`, and an income output of the same rate advances phase 26
- **THEN** its `capabilityProvider` carries rate `4` for the capability, and the income is credited separately

#### Scenario: Zero population produces nothing
- **WHEN** a residence with count `0` advances phase 26
- **THEN** its `capabilityProvider` carries rate `0`

#### Scenario: Accumulated output is published
- **WHEN** two consecutive phase 26 runs leave a carry of `500`, then the next run produces a whole extra unit
- **THEN** the published rate reflects the accumulated amount

#### Scenario: The second capability output does not displace the first
- **WHEN** a residence carries two capability outputs with rates `1` and `5`
- **THEN** the published provider carries rate `count × 1`
