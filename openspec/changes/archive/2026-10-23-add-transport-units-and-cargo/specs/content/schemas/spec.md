# Spec Delta

## ADDED Requirements

### Requirement: Transport-unit schema
The transport-unit schema SHALL accept `id`, optional `tags`, required `entity_definition`, required `cargo` (`compartment_policy` of `unrestricted`, `typed_slots`, or `per_resource`, `slots` ≥ 1, non-negative `slot_capacity`, and `acceptance` of `transportable_resources` or `all`), required `movement` (`speed_permille` ≥ 1, optional `mode` of `physical` or `abstract`, optional `allowed_connection_tags`), required `handling` (non-negative `loading_rate_per_tick` and `unloading_rate_per_tick`), optional `order_modes`, and optional `maintenance`. It SHALL reject unknown fields and unknown compartment policies.

Source: CONT-6.16

#### Scenario: A transport unit validates
- **WHEN** a transport unit declares typed cargo with two slots, movement speed `1000`, handling rates, and `order_modes: [route]`
- **THEN** it validates with no diagnostics

#### Scenario: An unknown compartment policy is rejected
- **WHEN** a transport unit declares `compartment_policy: containers`
- **THEN** validation reports `schema_invalid`

### Requirement: Transport-unit reference validation
Reference validation SHALL report `unresolved_reference` when a transport unit names an unknown `entity_definition` or an unknown maintenance resource.

Source: CONT-6.16, CONT-11.3

#### Scenario: An unknown transport entity definition is reported
- **WHEN** a transport unit names `test.entity.missing`
- **THEN** reference validation reports `unresolved_reference` at `entity_definition`
