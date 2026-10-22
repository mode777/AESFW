# Spec Delta

## MODIFIED Requirements

### Requirement: Entity definition and component schema
The entity-definition schema SHALL accept `id`, optional `includes`, and required `components` containing only `resource_source`, `producer`, `residence`, `storage_access`, `construction`, `placement`, and `connectivity`. `resource_source` SHALL have a `policy` of `infinite_rate` or `finite_deposit` and `outputs` of `{ resource, quantity_per_tick }`, where `finite_deposit` carries an optional non-negative `initial_quantity`; `producer` SHALL have `recipes`, `process_slots` ≥ 1, `input_inventory`, and `output_inventory`; `residence` SHALL have `population_tier`, `capacity` ≥ 1, optional `initial_population`, and `growth_policy`; `storage_access` SHALL have `inventory`; `construction` SHALL have `duration_ticks` ≥ 0, `costs` of `{ resource, quantity }`, a `commit_policy` of `start`, `continuous`, or `completion`, and an optional `deconstruction` block of `duration_ticks` ≥ 0, `returns` of `{ resource, quantity }`, and optional `cancel_reservations`; `placement` SHALL have an optional non-negative `capacity_cost`, an optional `footprint` of two positive integers (width by height), and optional `conditions` naming one or more condition definitions; `connectivity` SHALL carry exactly one of `requires` (a connectivity requirement) or `provides` (a connectivity provider), each a non-empty network id. The schema SHALL reject unknown components and fields, and SHALL reject a `connectivity` component that declares both `requires` and `provides` or neither.

Source: CONT-6.8, CONT-6.9, GDD-9.2, GDD-9.9, GDD-9.5, GDD-18.1, GDD-18.2, GDD-18.3

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

#### Scenario: A construction component validates
- **WHEN** an entity definition declares `construction` with `duration_ticks: 10`, a cost of `test.resource.build`, and `commit_policy: completion`
- **THEN** the content loads with no diagnostics

#### Scenario: An unknown commit policy is rejected
- **WHEN** an entity definition declares `construction` with `commit_policy: whenever`
- **THEN** validation reports `schema_invalid`

#### Scenario: A placement component validates
- **WHEN** an entity definition declares `placement` with `capacity_cost: 10`, a `footprint` of `[2, 2]`, and one condition
- **THEN** the content loads with no diagnostics

#### Scenario: A negative capacity cost is rejected
- **WHEN** an entity definition declares `placement` with `capacity_cost: -1`
- **THEN** validation reports `schema_invalid`

#### Scenario: A connectivity requirement component validates
- **WHEN** an entity definition declares `connectivity` with `requires: test.connectivity.hub`
- **THEN** schema validation accepts it

#### Scenario: A connectivity provider component validates
- **WHEN** an entity definition declares `connectivity` with `provides: test.connectivity.hub`
- **THEN** schema validation accepts it

#### Scenario: A connectivity component with both roles is rejected
- **WHEN** an entity definition declares `connectivity` with both `requires: test.connectivity.hub` and `provides: test.connectivity.hub`
- **THEN** validation reports `schema_invalid`

#### Scenario: A connectivity component with neither role is rejected
- **WHEN** an entity definition declares `connectivity` with neither `requires` nor `provides`
- **THEN** validation reports `schema_invalid`

## ADDED Requirements

### Requirement: Entity connectivity instantiation
`@aesfw/app` SHALL instantiate the core `connectivityNode` component for every content entity whose definition declares a `connectivity` component: a `requires` value SHALL produce a `requirement` node and a `provides` value SHALL produce a `provider` node, each carrying the declared network id. An entity whose definition declares no `connectivity` component SHALL carry no connectivity node.

Source: CONT-6.8, GDD-9.2, GDD-9.9

#### Scenario: A requiring entity is instantiated with a requirement node
- **WHEN** the definition `test.entity.refiner` declares `connectivity.requires` `test.connectivity.hub` and is instantiated
- **THEN** the created entity carries a `connectivityNode` with role `requirement` and network `test.connectivity.hub`

#### Scenario: A providing entity is instantiated with a provider node
- **WHEN** the definition `test.entity.connector` declares `connectivity.provides` `test.connectivity.hub` and is instantiated
- **THEN** the created entity carries a `connectivityNode` with role `provider` and network `test.connectivity.hub`

#### Scenario: A definition without connectivity yields no node
- **WHEN** a definition declares no `connectivity` component and is instantiated
- **THEN** the created entity carries no `connectivityNode`
