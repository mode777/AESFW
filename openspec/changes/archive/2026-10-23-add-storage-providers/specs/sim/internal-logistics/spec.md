# Spec Delta

## ADDED Requirements

### Requirement: Storage-provider expansion
An active storage provider SHALL add its configured total and per-resource capacity bonuses to its target inventory's effective capacity, and its configured throughput bonus to the throughput capacity of its location. An entity without a lifecycle component SHALL count as active; a planned, awaiting-resources, constructing, cancelled, or deconstructed provider SHALL add nothing.

Source: GDD-9.7, GDD-6.6, GDD-15.1

#### Scenario: A total capacity bonus raises the effective capacity
- **WHEN** an inventory has base total capacity `1000` and one active provider adds `500`
- **THEN** the effective total capacity is `1500`

#### Scenario: A per-resource bonus applies only to its resource
- **WHEN** an active provider adds `200` per-resource capacity for `test.r.a`
- **THEN** `test.r.a` has the expanded per-resource capacity and `test.r.b` does not

#### Scenario: A planned provider adds nothing
- **WHEN** a storage provider has lifecycle `planned`
- **THEN** its capacity and throughput bonuses are ignored

#### Scenario: A throughput bonus raises the location pool
- **WHEN** a throughput-limited location has base capacity `6000` and one active provider adds `2000`
- **THEN** the location's throughput capacity is `8000`

### Requirement: Effective inventory capacity
Inventory capacity checks and projections SHALL use the effective capacity: the inventory's declared total and per-resource capacities plus the bonuses of active storage providers that target it. A declared unlimited capacity SHALL remain unlimited.

Source: GDD-8.1, GDD-9.7, PIC-9.1

#### Scenario: A deposit beyond the base capacity succeeds within the bonus
- **WHEN** an inventory has base total capacity `1000`, stores `1000`, and an active provider adds `500`
- **THEN** a deposit of `500` succeeds

#### Scenario: A deposit beyond the effective capacity is rejected
- **WHEN** an inventory has base total capacity `1000`, an active provider adds `500`, and it already stores `1500`
- **THEN** a further deposit of `1` is rejected with `insufficient_capacity`

#### Scenario: An unlimited inventory stays unlimited
- **WHEN** an inventory declares total capacity `null`
- **THEN** storage-provider bonuses do not bound it
