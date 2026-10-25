# Spec Delta

## MODIFIED Requirements

### Requirement: Transition definitions
A transition SHALL carry `source_tier`, `target_tier`, optional `trigger`, optional `condition`, optional `costs`, `refund_policy`, `duration_ticks`, and a `conversion` with a population policy and optional target `entity_definition`; every referenced tier, condition, resource, and entity definition SHALL resolve. A transition MAY carry an `optional` flag; an `optional` transition is exempt from population-graph reachability validation.

Source: CONT-6.15, CONT-11.5, GDD-13

#### Scenario: A well-formed transition compiles
- **WHEN** a transition names resolvable tiers, a condition, a cost, and `conversion: { population: retain_count_clamped, entity_definition: test.entity.res2 }`
- **THEN** it compiles without diagnostics

#### Scenario: An unresolved target definition is reported
- **WHEN** a transition's `conversion.entity_definition` names an absent definition
- **THEN** the load reports the unknown reference

#### Scenario: An optional transition is accepted
- **WHEN** a transition declares `optional: true`
- **THEN** the schema accepts it and reachability validation exempts it
