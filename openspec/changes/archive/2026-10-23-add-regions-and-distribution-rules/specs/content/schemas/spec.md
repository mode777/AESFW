# Spec Delta

## MODIFIED Requirements

### Requirement: Location template schema
The location-template schema SHALL accept `id`, required `spatial_policy`, optional `spatial_parameters`, optional `tags`, optional `region` (a region definition ID), optional `properties` (integer values), required `inventories` (each with a local `id`, a `capacity` of `mode` `total` or `per_resource` and a non-negative `quantity`, and an `access_policy`), and required `activation` (`initial` boolean). It SHALL reject unknown fields.

Source: CONT-6.4, CONT-6.18

#### Scenario: An abstract-capacity location template validates
- **WHEN** a location template `test.location.a` uses `spatial_policy` `framework.spatial.abstract_capacity` with `spatial_parameters` `{ total_capacity: 100 }` and one inventory `shared`
- **THEN** it validates with no diagnostics

#### Scenario: A location template without activation is rejected
- **WHEN** a location template omits `activation`
- **THEN** validation reports `schema_invalid`

#### Scenario: A location template with a region validates
- **WHEN** a location template declares `region: test.region.alpha` and region `test.region.alpha` exists
- **THEN** it validates with no diagnostics

## ADDED Requirements

### Requirement: Region and distribution-rule collections
The schema catalogue SHALL accept the `regions` collection (`{ id, tags? }`) and the `distribution_rules` collection (`{ id, regions, disjoint: { properties, source_slot_types }, generation: { mode, seed_stream? } }`) with `mode` limited to `fixed` and `seeded`, and SHALL reject unknown fields on both.

Source: CONT-6.18

#### Scenario: A region definition validates
- **WHEN** a region `test.region.alpha` carries `tags: [test.region.group]`
- **THEN** it validates with no diagnostics

#### Scenario: An unknown generation mode is rejected
- **WHEN** a distribution rule declares `generation.mode: random`
- **THEN** validation reports `schema_invalid`

#### Scenario: A distribution rule with unknown fields is rejected
- **WHEN** a distribution rule carries a field outside the schema
- **THEN** validation reports `schema_invalid` at that field's path
