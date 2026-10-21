# Spec Delta

## MODIFIED Requirements

### Requirement: Entity definition and component schema
The entity-definition schema SHALL accept `id`, optional `includes`, and required `components` containing only `resource_source`, `producer`, `residence`, and `storage_access`. `resource_source` SHALL have a `policy` of `infinite_rate` or `finite_deposit` and `outputs` of `{ resource, quantity_per_tick }`, where `finite_deposit` carries an optional non-negative `initial_quantity`; `producer` SHALL have `recipes`, `process_slots` ≥ 1, `input_inventory`, and `output_inventory`; `residence` SHALL have `population_tier`, `capacity` ≥ 1, optional `initial_population`, and `growth_policy`; `storage_access` SHALL have `inventory`. The schema SHALL reject unknown components and fields.

Source: CONT-6.8, CONT-6.9, GDD-9.5

#### Scenario: A producer entity definition validates
- **WHEN** an entity definition has a `producer` component with one recipe, `process_slots: 1`, and shared-location inventories
- **THEN** it validates with no diagnostics

#### Scenario: A residence entity definition validates
- **WHEN** an entity definition has a `residence` component with a tier, `capacity: 10`, and a growth policy
- **THEN** it validates with no diagnostics

#### Scenario: An unknown component is rejected
- **WHEN** an entity definition has a component named `teleporter`
- **THEN** validation reports `schema_invalid`

#### Scenario: A finite-deposit source is valid
- **WHEN** an entity definition declares a `resource_source` with `policy: finite_deposit` and `initial_quantity: 5000`
- **THEN** schema validation accepts it

#### Scenario: An unknown source policy is rejected
- **WHEN** an entity definition declares a `resource_source` with `policy: regenerating`
- **THEN** schema validation reports `schema_invalid`
