# Spec Delta

## Purpose

R1 economy content (07 §4–§5): the credits balance resource, the S1 income output, and maintenance on the R1 production entities.

## ADDED Requirements

### Requirement: R1 credits economy
The reference content SHALL define `ref.tier.resource.credits` as a non-transportable balance resource with owner scope and `allow_negative: true` at the reference base scale, and the population tier `ref.tier.population.s1` SHALL output credits at `10` per population per tick in owner scope in addition to its capability output.

Source: REF-5, REF-7 (07 §4)

#### Scenario: The credits resource validates
- **WHEN** `aesfw validate reference/content/ref.tier --strict` runs
- **THEN** it exits `0` and the credits resource declares `allow_negative: true` with owner storage scope

#### Scenario: The tier produces credits
- **WHEN** the content is loaded
- **THEN** `ref.tier.population.s1` carries a credits output of `10` per population per tick in owner scope

### Requirement: R1 maintenance
The R1 production entities — `ref.tier.entity.slot_extractor_p2`, `ref.tier.entity.area_extractor_p1`, `ref.tier.entity.refiner`, and `ref.tier.entity.combiner` — SHALL each carry a `maintenance` component charging `6000` credits per `60` ticks while enabled, with the `owner_deficit_policy` shortage policy. The connector SHALL NOT carry maintenance.

Source: REF-5, REF-7 (07 §4, §5 R1)

#### Scenario: The refiner pays maintenance
- **WHEN** the content is loaded
- **THEN** `ref.tier.entity.refiner` carries `interval_ticks: 60` and one credits input of quantity `6000`

#### Scenario: The connector is maintenance-free
- **WHEN** the content is loaded
- **THEN** `ref.tier.entity.connector` carries no `maintenance` component
