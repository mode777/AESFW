# content/schemas Specification

## Purpose

The TypeBox definition schemas for the M1 content set (CONT-6.1, 6.2, 6.4, 6.7–6.11, 6.13, 6.14), the stable-ID rules of CONT-4, raw-document schema validation (TDS-20.2 step 4), and the published JSON Schema artifact (TDS-20.4). These schemas are the contract every later content stage and simulation row compiles from.

## Requirements

### Requirement: Resource schema
The resource schema SHALL accept `id`, optional `tags`, optional `complexity`, required `quantity` (`precision` of `integer` or `fixed` and `scale` ≥ 1), required `storage` (`policy` of `normal` or `recomputed` and `scope` of `inventory`, `location`, `owner`, or `global`), required `transportable`, optional `substitutes`, optional `allow_negative`, and optional `presentation_key`. A capability is a resource; the schema SHALL reject unknown fields.

Source: CONT-6.1, CONT-6.2

#### Scenario: A capability resource validates
- **WHEN** a resource `test.capability.tier_1` has tags `[virtual, capability]`, `quantity` `{ precision: integer, scale: 1 }`, `storage` `{ policy: recomputed, scope: location }`, and `transportable: false`
- **THEN** it validates with no diagnostics

#### Scenario: A resource with an unknown field is rejected
- **WHEN** a resource carries a field not in the schema
- **THEN** validation reports `schema_invalid` at that field's path

#### Scenario: A resource with an invalid scale is rejected
- **WHEN** a resource has `quantity.scale` `0`
- **THEN** validation reports `schema_invalid`

### Requirement: Location template schema
The location-template schema SHALL accept `id`, required `spatial_policy`, optional `spatial_parameters`, optional `tags`, optional `properties` (integer values), required `inventories` (each with a local `id`, a `capacity` of `mode` `total` or `per_resource` and a non-negative `quantity`, and an `access_policy`), and required `activation` (`initial` boolean). It SHALL reject unknown fields.

Source: CONT-6.4

#### Scenario: An abstract-capacity location template validates
- **WHEN** a location template `test.location.a` uses `spatial_policy` `framework.spatial.abstract_capacity` with `spatial_parameters` `{ total_capacity: 100 }` and one inventory `shared`
- **THEN** it validates with no diagnostics

#### Scenario: A location template without activation is rejected
- **WHEN** a location template omits `activation`
- **THEN** validation reports `schema_invalid`

### Requirement: Recipe schema
The recipe schema SHALL accept `id`, `mode` of `batch` or `continuous`, `duration_ticks` ≥ 1, `inputs` and `outputs` arrays of `{ resource, quantity }` with non-negative integer quantities, optional `capability_requirements`, and optional `conditions`. It SHALL reject unknown fields.

Source: CONT-6.7

#### Scenario: A batch recipe validates
- **WHEN** a recipe has `mode: batch`, `duration_ticks: 10`, one input, one output, and one capability requirement
- **THEN** it validates with no diagnostics

#### Scenario: A recipe with a non-positive duration is rejected
- **WHEN** a recipe has `duration_ticks: 0`
- **THEN** validation reports `schema_invalid`

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

### Requirement: Construction cost references
A construction cost or deconstruction return SHALL name a resource definition; an unresolved or wrong-type reference SHALL be reported.

Source: CONT-6.8, CONT-11.3

#### Scenario: An unknown cost resource is reported
- **WHEN** a construction cost names `test.resource.absent`
- **THEN** the content reports `unresolved_reference`

### Requirement: Placement condition references
A `placement` `conditions` entry SHALL name a condition definition; an unresolved or wrong-type reference SHALL be reported.

Source: CONT-6.8, CONT-11.3, GDD-18.2

#### Scenario: An unknown placement condition is reported
- **WHEN** a placement condition names `test.condition.absent`
- **THEN** the content reports `unresolved_reference`

#### Scenario: A placement condition naming a resource is reported
- **WHEN** a placement condition names `test.resource.build`
- **THEN** the content reports `reference_type_mismatch`

### Requirement: Population tier schema
The population-tier schema SHALL accept `id`, optional `consumption_factor` ≥ 1, required `need_categories`, and required `outputs` of `{ resource, scope, rate_per_population_per_tick }` with optional `satisfaction_curve`. It SHALL reject unknown fields.

Source: CONT-6.10

#### Scenario: A population tier validates
- **WHEN** a tier has `need_categories: [test.need_category.base]` and one capability output at `scope: location`
- **THEN** it validates with no diagnostics

#### Scenario: A tier output with a negative rate is rejected
- **WHEN** a tier output has `rate_per_population_per_tick: -1`
- **THEN** validation reports `schema_invalid`

### Requirement: Need schema
The need schema SHALL accept `id`, `category`, `applies_to`, a `demand` discriminated union of `resource_consumption` (`resource`, `quantity_per_population_per_tick`, optional `inventory_access_purpose`) or `resource_availability` (`resource`, `minimum_quantity`), and `fulfillment` (`measurement_window_ticks` ≥ 1 and `target_ratio` between 0 and 1000). It SHALL reject unknown demand types and fields.

Source: CONT-6.11

#### Scenario: A resource-consumption need validates
- **WHEN** a need has `demand.type: resource_consumption` with a resource and a per-population quantity
- **THEN** it validates with no diagnostics

#### Scenario: A resource-availability need validates
- **WHEN** a need has `demand.type: resource_availability` with a minimum quantity
- **THEN** it validates with no diagnostics

#### Scenario: An unknown demand type is rejected
- **WHEN** a need has `demand.type: telepathy`
- **THEN** validation reports `schema_invalid`

### Requirement: Need category schema
The need-category schema SHALL accept `id`, `evaluation` (`mode` of `all` or `weighted_score`, optional `required_score`, optional `required_score_by_tier`), and `members` of `{ need, weight }`. It SHALL reject unknown fields.

Source: CONT-6.13

#### Scenario: A weighted-score need category validates
- **WHEN** a category has `evaluation.mode: weighted_score`, a required score, and one weighted member
- **THEN** it validates with no diagnostics

#### Scenario: An all-mode need category validates
- **WHEN** a category has `evaluation.mode: all` and one member
- **THEN** it validates with no diagnostics

### Requirement: Growth policy schema
The growth-policy schema SHALL accept `id`, `interval_ticks` ≥ 1, and optional `increase` and `decrease` steps, each `{ quantity ≥ 0, condition }`. It SHALL reject unknown fields.

Source: CONT-6.14

#### Scenario: A growth policy with increase and decrease validates
- **WHEN** a growth policy has an interval, an increase step, and a decrease step
- **THEN** it validates with no diagnostics

#### Scenario: A growth policy with a zero interval is rejected
- **WHEN** a growth policy has `interval_ticks: 0`
- **THEN** validation reports `schema_invalid`

### Requirement: Stable identifier rules
`isValidDefinitionId(id)` SHALL return true only for lowercase ASCII identifiers of two or more period-separated segments whose segments contain only lowercase letters, digits, and underscores. Validation SHALL report `invalid_id` for a definition whose `id` violates the rule.

Source: CONT-4

#### Scenario: A qualified identifier is valid
- **WHEN** `isValidDefinitionId('example.population.tier_1')` is evaluated
- **THEN** it is true

#### Scenario: An uppercase identifier is invalid
- **WHEN** a definition has `id: Example.Resource.A`
- **THEN** validation reports `invalid_id`

#### Scenario: A single-segment identifier is invalid
- **WHEN** `isValidDefinitionId('resource')` is evaluated
- **THEN** it is false

### Requirement: Raw-document schema validation
`validateSchemas(files, options)` SHALL accept the parsed files of `parseFiles` and return validated raw definitions grouped by collection plus diagnostics, without throwing. For each top-level key it SHALL map to a known definition collection, reject a non-array collection value with `invalid_definition_document`, validate each item against the collection's schema (`schema_invalid`), and validate each item's `id` (`invalid_id`). In strict mode it SHALL report `unknown_definition_type` for an unknown top-level key; in lenient mode it SHALL ignore it.

Source: CONT-11.2, TDS-20.2

#### Scenario: Valid documents produce grouped raw definitions
- **WHEN** a file carries `resources` and `recipes` arrays of valid items
- **THEN** the result groups them under `resources` and `recipes` with no diagnostics

#### Scenario: An unknown collection is rejected in strict mode
- **WHEN** a file has a top-level key `spells` and strictness is `strict`
- **THEN** validation reports `unknown_definition_type`

#### Scenario: An unknown collection is ignored in lenient mode
- **WHEN** a file has a top-level key `spells` and strictness is `lenient`
- **THEN** validation reports no `unknown_definition_type`

#### Scenario: A non-array collection is rejected
- **WHEN** a file's `resources` value is a mapping
- **THEN** validation reports `invalid_definition_document`

#### Scenario: An invalid item does not throw
- **WHEN** a file's `resources` array holds an item that is not an object
- **THEN** validation reports `schema_invalid` and does not throw

### Requirement: Balance resource scope validation
Content validation SHALL report a diagnostic when a resource sets `allow_negative: true` while its storage scope is neither `owner` nor `global`.

Source: CONT-6.3

#### Scenario: allow_negative on an inventory-scoped resource is rejected
- **WHEN** a package defines a resource with `storage.scope: inventory` and `allow_negative: true`
- **THEN** validation fails with the scope diagnostic

#### Scenario: allow_negative on an owner-scoped resource is accepted
- **WHEN** a package defines a resource with `storage.scope: owner` and `allow_negative: true`
- **THEN** validation passes

### Requirement: Definition collection catalogue
`@aesfw/content` SHALL publish the collection catalogue mapping each top-level document key to a core `DefinitionType` — `resources` → `resource`, `location_templates` → `location`, `recipes` → `recipe`, `entity_definitions` → `entity`, `population_tiers` → `tier`, `needs` → `need`, `need_categories` → `needCategory`, `growth_policies` → `growthPolicy`, `conditions` → `condition`, `curves` → `curve` — in canonical order, for the registry compilation of roadmap 1.4 to consume.

Source: CONT-6, CONT-7, CONT-8, TDS-7

#### Scenario: The catalogue covers the M1 collections in canonical order
- **WHEN** the catalogue is read
- **THEN** its keys are exactly the ten M1 collections, each mapping to its core definition type

### Requirement: Published JSON Schema

`@aesfw/content` SHALL export each definition schema as a JSON Schema file under `packages/content/schemas/<collection>.json` (TDS-20.4), generated from the TypeBox schemas. The committed files SHALL equal the schemas the code produces.

Source: TDS-20.4

#### Scenario: Exported schemas match the committed files
- **WHEN** the export function is compared with the committed JSON Schema files
- **THEN** each committed file equals the exported schema for its collection

### Requirement: Entity maintenance component schema
The entity `components` object SHALL accept an optional `maintenance` component with required `interval_ticks` (integer ≥ 1), required non-empty `inputs` (each `{ resource, quantity }` with integer `quantity ≥ 1`), required `charge_policy` (`while_exists`, `while_enabled`, `while_active`, or `while_processing`), and required `shortage_policy` (`deactivate_entity`, `scale`, `accumulate_debt`, `ignore`, `trigger_transition`, or `owner_deficit_policy`). The schema SHALL reject unknown fields.

Source: CONT-6.8, GDD-20.1

#### Scenario: A maintenance component validates
- **WHEN** an entity definition declares `maintenance` with `interval_ticks: 60`, one input of quantity `30000`, `charge_policy: while_enabled`, and `shortage_policy: owner_deficit_policy`
- **THEN** it validates with no diagnostics

#### Scenario: A maintenance component with an unknown field is rejected
- **WHEN** a `maintenance` component carries a field outside the schema
- **THEN** validation reports `schema_invalid`

#### Scenario: A maintenance component with an empty inputs list is rejected
- **WHEN** a `maintenance` component declares `inputs: []`
- **THEN** validation reports `schema_invalid`
