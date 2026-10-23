# sim/transitions Specification

## Purpose

Tier transitions (GDD-13, CONT-6.15) move a residence between population tiers through paid advancement or unrefunded decline, with configurable triggers, conversion, refund, and empty-residence policies.

## Requirements

### Requirement: Transition definitions
A transition SHALL carry `source_tier`, `target_tier`, optional `trigger`, optional `condition`, optional `costs`, `refund_policy`, `duration_ticks`, and a `conversion` with a population policy and optional target `entity_definition`; every referenced tier, condition, resource, and entity definition SHALL resolve.

Source: CONT-6.15, GDD-13

#### Scenario: A well-formed transition compiles
- **WHEN** a transition names resolvable tiers, a condition, a cost, and `conversion: { population: retain_count_clamped, entity_definition: test.entity.res2 }`
- **THEN** it compiles without diagnostics

#### Scenario: An unresolved target definition is reported
- **WHEN** a transition's `conversion.entity_definition` names an absent definition
- **THEN** the load reports the unknown reference

### Requirement: Manual transition request
`RequestPopulationTransition { entity, transition }` SHALL be applied only when the entity is a residence, the transition's source tier equals the residence's tier, and its condition (when present) holds; otherwise it SHALL be rejected with `unknown_entity`, `unknown_definition`, `invalid_transition`, or `not_eligible`. The costs SHALL be withdrawn atomically from the location's accessible inventories with purpose `population_transition`, and a shortage SHALL reject with `insufficient_quantity` without changing state.

Source: GDD-13.1, TDS-16.2, ARCH-6

#### Scenario: An eligible transition starts and pays its costs
- **WHEN** a tier-1 residence with `500` gold requests a `100`-gold transition with a true condition
- **THEN** the command is applied, the inventory holds `400`, and a running transition completes in `duration_ticks`

#### Scenario: A false condition is rejected
- **WHEN** the transition's condition does not hold
- **THEN** the command is rejected with `not_eligible` and no cost is paid

#### Scenario: A cost shortage is rejected atomically
- **WHEN** the residence's location holds `50` gold for a `100`-gold transition
- **THEN** the command is rejected with `insufficient_quantity` and the inventory stays `50`

### Requirement: Transition completion and conversion
Phase 24 SHALL complete a running transition when the tick reaches its completion tick, applying the population conversion (`retain_count`, `retain_count_clamped`, `clamp_to_target_capacity`, `retain_occupancy_ratio`, `set_fixed`, `apply_multiplier`), replacing the residence and group with the target entity definition's tier, capacity, needs, categories, and outputs when one is configured, and depositing the configured refund.

Source: GDD-13.3, CONT-6.15

#### Scenario: Advancement clamps population to the target capacity
- **WHEN** a tier-1 residence with `25` population advances to a target residence of capacity `20` under `retain_count_clamped`
- **THEN** the group has tier 2, capacity `20`, and count `20`

#### Scenario: A fraction refund is deposited
- **WHEN** a transition costs `100` with `refund_policy: { policy: fraction, fraction: 500 }` and completes
- **THEN** `50` of the resource is deposited into the location's inventory

### Requirement: Automatic and decline triggers
Phase 24 SHALL start an `automatic` or `condition_duration` transition whose source tier matches a residence when its condition holds, and SHALL start the decline transition after a band's `trigger_decline` grace period elapses, using the band's named transition or the tier's single `decline_transitions` entry.

Source: GDD-13.2, GDD-13.4, GDD-12.6

#### Scenario: A band grace period starts the decline
- **WHEN** a residence's band has `grace_ticks: 2`, its decline counter reaches `2`, and the tier lists one decline transition
- **THEN** phase 24 starts that decline transition

### Requirement: Empty-residence policies
When a residence's population is zero, phase 24 SHALL apply its definition's empty-residence policy: `retain` keeps it, `revert` replaces it with the configured definition, and `decay` schedules its deconstruction after `delay_ticks`.

Source: GDD-9.3, GDD-13.4

#### Scenario: An empty residence reverts
- **WHEN** a zero-population residence's definition declares `empty_residence: { policy: revert, definition: test.entity.revert }`
- **THEN** phase 24 replaces its definition with the revert target

#### Scenario: An empty residence decays
- **WHEN** the policy is `decay` with `delay_ticks: 5`
- **THEN** the entity is scheduled for deconstruction at `tick + 5`
