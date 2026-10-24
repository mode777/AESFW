# Abstract Economic Simulation Framework
## Content Configuration Specification

**Version:** 1.1  
**Status:** Authoring and validation baseline

---

## 1. Purpose

This specification defines how a complete game definition is assembled through configuration packages without modifying framework source code.

It covers:

- Package structure
- Stable identifiers
- Schemas and references
- Composition
- Conditions and curves
- Validation
- Versioning and migrations
- A complete minimal example

YAML is used for readability. JSON or another schema-equivalent format may be supported, but one canonical normalized representation must exist.

---

## 2. Package Structure

```text
content/
  framework-core/
    package.yaml
    schemas/

  example-game/
    package.yaml
    resources.yaml
    regions.yaml
    world.yaml
    locations.yaml
    connections.yaml
    needs.yaml
    population.yaml
    satisfaction.yaml
    recipes.yaml
    entities.yaml
    transport.yaml
    exchanges.yaml
    economy.yaml
    transitions.yaml
    unlocks.yaml
    conditions.yaml
    curves.yaml

  example-modules/
    package.yaml
    scenario_objectives.yaml
    disruptions.yaml

  example-presentation/
    package.yaml
    localization.yaml
    mappings.yaml
    assets.yaml
```

Simulation packages, optional-module packages, and presentation packages are independently loadable. A simulation package must be complete and valid without any optional-module package.

---

## 3. Package Manifest

```yaml
package:
  id: example.game
  version: 1.0.0
  schema_version: 1
  type: simulation_content

  dependencies:
    - package: framework.core
      version: ">=1.0.0 <2.0.0"

  files:
    - resources.yaml
    - regions.yaml
    - world.yaml
    - locations.yaml
    - connections.yaml
    - needs.yaml
    - population.yaml
    - satisfaction.yaml
    - recipes.yaml
    - entities.yaml
    - transport.yaml
    - exchanges.yaml
    - economy.yaml
    - transitions.yaml
    - unlocks.yaml
    - conditions.yaml
    - curves.yaml

  migrations:
    - from: 0.9.0
      file: migrations/0.9.0-to-1.0.0.yaml
```

Package IDs are globally unique. Versions use semantic versioning.

---

## 4. Stable Identifiers

Recommended form:

```text
namespace.category.name
```

Rules:

- Lowercase ASCII
- Segments separated by periods
- No display text in IDs
- IDs never reused for semantically different definitions
- Renames require migration aliases

Examples:

```text
example.resource.a
example.population.tier_1
example.need.category_a.resource_c
example.recipe.resource_c
example.entity.residence_1
```

---

## 5. Definition Composition

Prefer composition over inheritance.

```yaml
entity_template:
  id: example.template.producer
  components:
    construction:
      duration_ticks: 10
    producer:
      process_slots: 1
    enabled:
      default: true

entity_definition:
  id: example.entity.producer_c
  includes:
    - example.template.producer
  components:
    producer:
      recipes: [example.recipe.c]
    capability_consumer:
      requirements:
        - resource: example.capability.tier_1
          quantity: 10
```

Merge rules:

- Scalars override
- Maps merge by key
- Lists replace by default
- Explicit `append`, `prepend`, and `remove` operations are supported
- Include cycles are invalid
- Resolved definitions are immutable

An explicit list operation is written as a mapping with exactly one of the keys `append`, `prepend`, or `remove`, whose value is a list; it applies to the inherited list, and `remove` drops deeply equal entries (clarification A-05, roadmap 1.3).

---

## 6. Core Definition Schemas

### 6.1 Resource

```yaml
resource:
  id: example.resource.a
  tags: [storable, example.category.primary]
  complexity: 1
  quantity:
    precision: fixed
    scale: 1000
  storage:
    policy: normal
    scope: inventory
  transportable: true
  presentation_key: example.resource.a
```

Required: `id`, `quantity`, `storage.policy`, `transportable`. `complexity` is optional content data, typically used as need-category weight.

### 6.2 Capability resource

```yaml
resource:
  id: example.capability.tier_1
  tags: [virtual, capability]
  quantity:
    precision: integer
    scale: 1
  storage:
    policy: recomputed
    scope: location
  transportable: false
  substitutes: []
```

Capability matching is exact. `substitutes` lists other capabilities that may satisfy requests for this one; it is empty by default and should stay empty for tier capabilities (pyramid rule).

### 6.3 Balance resource

```yaml
resource:
  id: example.resource.currency
  tags: [balance]
  quantity:
    precision: fixed
    scale: 1000
  storage:
    policy: normal
    scope: owner
  transportable: false
  allow_negative: true
```

Only owner- or global-scoped resources may set `allow_negative`.

### 6.4 Location template

```yaml
location_template:
  id: example.location.standard
  spatial_policy: framework.spatial.grid
  spatial_parameters:
    width: 40
    height: 40
    buildable_ratio: { min: 400, max: 700 }
  region: example.region.alpha
  tags: [example.location.group_a]
  properties:
    example.property.suitability_p1: 1000
    example.property.suitability_p3: 500
    example.property.suitability_p4: 0
  source_slots:
    - type: example.slot.v_a
      count: 2
  internal_logistics:
    policy: framework.inventory.throughput_limited
    base_throughput_capability: example.capability.throughput
  inventories:
    - id: shared
      capacity:
        mode: per_resource
        quantity: 500000
      access_policy: framework.inventory.shared_location
  knowledge:
    initial: unknown
  establishment: example.establishment.default
  activation:
    initial: false
```

`properties` and `source_slots` may be fixed or generated by a seeded, deterministic distribution rule (Section 6.18).

### 6.5 Connection definition

```yaml
connection_definition:
  id: example.connection.standard
  tags: [example.connection.transport]
  direction: bidirectional
  traversal:
    base_duration_ticks: 100
    costs: []
  allowed_transport_tags: [example.transport.standard]
```

`base_duration_ticks` is the traversal time at reference speed (`speed_permille: 1000`). A unit needs `ceil(base_duration_ticks × 1000 ÷ speed_permille)` ticks. Connections are usable only by transport.

### 6.6 World definition

Templates and connection types become a concrete sector graph through a world definition. It is loaded at session creation and may be replaced per scenario.

```yaml
world:
  id: example.world.prototype
  locations:
    - id: example.loc.a1
      template: example.location.standard
      region: example.region.alpha
    - id: example.loc.b1
      template: example.location.standard
      region: example.region.beta
      properties:
        example.property.suitability_p3: 1000
    - id: example.trade.alpha
      template: example.location.trade_node
      region: example.region.alpha
  connections:
    - id: example.conn.a1_b1
      definition: example.connection.standard
      origin: example.loc.a1
      destination: example.loc.b1
      base_duration_ticks: 300
      enabled: true
    - id: example.conn.a1_trade
      definition: example.connection.standard
      origin: example.loc.a1
      destination: example.trade.alpha
      enabled: true
  owners:
    - id: owner.1
      initial_resources:
        - { resource: example.resource.currency, quantity: 5000000 }
      established_locations: [example.loc.a1]
      known_locations: [example.loc.a1, example.trade.alpha]
      initial_entities:
        - { definition: example.entity.hub, location: example.loc.a1 }
        - { definition: example.entity.transport_basic, location: example.loc.a1 }
```

Instance fields override template fields. Connection instances may override `base_duration_ticks`. Validation checks that the graph is connected where required and that distribution rules hold for every instance. A location no owner lists in `established_locations` has no owner (unestablished; 01 §16.3) instead of defaulting to the first owner (A13, 05 §26). If no world definition is present, each location template with `activation.initial: true` is instantiated once for a single default owner (used by minimal fixtures such as Section 14).

### 6.7 Recipe

```yaml
recipe:
  id: example.recipe.c
  mode: batch
  duration_ticks: 60
  inputs:
    - resource: example.resource.a
      quantity: 2000
    - resource: example.resource.b
      quantity: 1000
  outputs:
    - resource: example.resource.c
      quantity: 1000
  capability_requirements:
    - resource: example.capability.tier_1
      quantity: 10
  conditions: example.condition.location_group_a
```

### 6.8 Entity definition

```yaml
entity_definition:
  id: example.entity.producer_c
  components:
    placement:
      capacity_cost: 10
      conditions: example.condition.place_standard
    construction:
      duration_ticks: 10
      costs:
        - resource: example.resource.construction
          quantity: 5000
      commit_policy: completion
    producer:
      recipes: [example.recipe.c]
      process_slots: 1
      input_inventory: location.shared
      output_inventory: location.shared
    capability_consumer:
      allocation_model: binary
    connectivity:
      requires: example.connectivity.hub_network
    maintenance:
      interval_ticks: 60
      inputs:
        - resource: example.resource.currency
          quantity: 30000
      charge_policy: while_enabled
      shortage_policy: owner_deficit_policy
    lifecycle:
      initially_enabled: true
```

The `connectivity` component declares exactly one of `requires` (the entity needs the named connectivity network) or `provides` (the entity extends the named connectivity network, for example the connector archetype of 01 §9.11). A definition that declares both or neither is invalid. (Amended by A8, 05 §26.)

```yaml
entity_definition:
  id: example.entity.connector
  components:
    connectivity:
      provides: example.connectivity.hub_network
```

Area and slot sources:

```yaml
entity_definition:
  id: example.entity.area_extractor_p1
  components:
    placement:
      footprint: [3, 3]
      working_area: { cells: 12, exclusive: true }
    resource_source:
      policy: area_dependent
      outputs:
        - resource: example.resource.p1
          quantity_per_tick: 66
      scale_by_property: example.property.suitability_p1
```

```yaml
entity_definition:
  id: example.entity.slot_extractor_p2
  components:
    placement:
      footprint: [3, 3]
      requires_slot: example.slot.v_a
    resource_source:
      policy: slot_dependent
      depletion: none
      outputs:
        - resource: example.resource.p2
          quantity_per_tick: 66
```

Coverage service:

```yaml
entity_definition:
  id: example.entity.coverage_service
  components:
    service_provider:
      mode: coverage
      service: example.service.b3
      relation: { type: radius, cells: 18 }
      consumes: []
```

### 6.9 Residence definition

```yaml
entity_definition:
  id: example.entity.residence_1
  components:
    placement:
      capacity_cost: 5
      conditions: example.condition.place_standard
    construction:
      duration_ticks: 5
      costs:
        - resource: example.resource.construction
          quantity: 1000
    residence:
      population_tier: example.population.tier_1
      capacity: 10
      growth_policy: example.growth.default
      empty_policy: { action: decay, delay_ticks: 0 }
```

### 6.10 Population tier

```yaml
population_tier:
  id: example.population.tier_1
  consumption_factor: 1000
  need_categories: [example.need_category.a]
  satisfaction:
    aggregation: average
    bands: example.bands.default
  outputs:
    - resource: example.capability.tier_1
      scope: location
      rate_per_population_per_tick: 1
    - resource: example.resource.currency
      scope: owner
      rate_per_population_per_tick: 10
      satisfaction_curve: example.curve.income_by_satisfaction
  advancement_transitions:
    - example.transition.tier_1_to_2
  decline_transitions: []
```

### 6.11 Need

```yaml
need:
  id: example.need.a1
  category: example.need_category.a
  applies_to: [example.population.tier_1]
  demand:
    type: resource_consumption
    resource: example.resource.c
    quantity_per_population_per_tick: 10
    inventory_access_purpose: population_need
  fulfillment:
    measurement_window_ticks: 100
    target_ratio: 1000
```

`demand` is a discriminated union over the supplier types of the Core Game Framework GDD:

```yaml
demand:
  type: resource_availability
  resource: example.resource.d
  minimum_quantity: 10000
```

```yaml
demand:
  type: service_capacity
  service: example.service.capacity_x
  quantity_per_population_per_tick: 1
```

```yaml
demand:
  type: spatial_coverage
  service: example.service.b3
  required_distinct_providers: 1
  provider_selector: { by_tag: example.tag.service_b3 }
```

```yaml
demand:
  type: state_query
  condition: example.condition.some_state
```

For `spatial_coverage`, the residence counts as fully supplied when at least `required_distinct_providers` active providers of the referenced service cover it under their configured relation. Tier-specific depth (e.g. requirement 1, 2, 3 for higher tiers) is expressed through the category's `required_score_by_tier` together with several coverage needs of different weights.

### 6.12 Service definition

```yaml
service:
  id: example.service.b3
  mode: coverage            # or capacity
  default_relation: { type: radius, cells: 18 }
```

Coverage services consume no resources; capacity services generate a capability that `service_capacity` needs allocate.

### 6.13 Need category

```yaml
need_category:
  id: example.need_category.a
  evaluation:
    mode: weighted_score
    required_score: 1000
    required_score_by_tier:
      example.population.tier_2: 2000
  members:
    - need: example.need.a1
      weight: 1000
```

For `weighted_score`, each member contributes `weight × min(1, fulfillment)`; the category result is `min(1, sum ÷ required score for the tier)`. Weights typically equal resource complexity.

### 6.14 Growth policy

```yaml
population_growth:
  id: example.growth.default
  interval_ticks: 10
  increase:
    quantity: 1
    condition: example.condition.population_growth
  decrease:
    quantity: 1
    condition: example.condition.population_decline
```

### 6.15 Transition

```yaml
transition:
  id: example.transition.tier_1_to_2
  source_tier: example.population.tier_1
  target_tier: example.population.tier_2
  trigger: manual_command
  condition: example.condition.advance_1_to_2
  costs:
    - resource: example.resource.construction
      quantity: 5000
  cost_source: location_inventory
  cost_access_purpose: population_transition
  refund_policy: none
  duration_ticks: 10
  conversion:
    population: retain_count_clamped
    entity_definition: example.entity.residence_2
```

A decline transition uses the same schema with `refund_policy: none` and `population: clamp_to_target_capacity` in the reference configuration.

### 6.16 Transport unit

```yaml
transport_unit:
  id: example.transport.basic
  tags: [example.transport.standard]
  entity_definition: example.entity.transport_basic
  cargo:
    compartment_policy: typed_slots
    slots: 2
    slot_capacity: 50000
    acceptance: transportable_resources
  movement:
    speed_permille: 1000
  handling:
    loading_rate_per_tick: 10000
    unloading_rate_per_tick: 10000
  order_modes: [route, explore, establish, trade]
```

### 6.17 Unlock

```yaml
unlock:
  id: example.unlock.tier_2_content
  scope: owner
  reversible: false
  targets:
    - type: population_tier
      id: example.population.tier_2
    - type: entity_definition
      id: example.entity.residence_2
  condition: example.condition.unlock_tier_2
```

### 6.18 Region and distribution rule

```yaml
region:
  id: example.region.alpha
  tags: [example.region.group]
```

```yaml
distribution_rule:
  id: example.distribution.disjoint_alpha_beta
  regions: [example.region.alpha, example.region.beta]
  disjoint:
    properties: [example.property.suitability_*]
    source_slot_types: true
  generation:
    mode: fixed           # or seeded
    seed_stream: world_generation
```

A disjoint rule guarantees that no single region can supply every raw resource. Validation checks the rule against all location templates.

### 6.19 Satisfaction bands

```yaml
satisfaction_bands:
  id: example.bands.default
  bands:
    - min: 800
      effects:
        - { type: growth, policy: example.growth.influx }
        - { type: output_multiplier, resource: example.resource.currency, value: 1000 }
        - { type: enable_advancement }
    - min: 500
      effects:
        - { type: output_multiplier, resource: example.resource.currency, value: 700 }
    - min: 250
      effects:
        - { type: output_multiplier, resource: example.resource.currency, value: 400 }
        - { type: trigger_decline, transition: example.transition.tier_2_to_1, grace_ticks: 60 }
    - min: 0
      effects:
        - { type: growth, policy: example.growth.emigration }
```

Bands must cover the full range 0–1000 without overlap. `trigger_decline` names its transition; if omitted, the tier's `decline_transitions` must contain exactly one entry. Validation checks that the named transition's source tier matches every tier using the band table.

### 6.20 Location establishment

```yaml
location_establishment:
  id: example.establishment.default
  requires_knowledge: discovered
  requires_unoccupied: true
  cost_source: transport_cargo
  costs:
    - resource: example.resource.establishment_package
      quantity: 1000
  creates_hub: example.entity.hub
  activation: on_completion
  ownership: exclusive
```

### 6.21 Exchange

```yaml
exchange:
  id: example.exchange.region_alpha
  location: example.location.trade_node_alpha
  currency: example.resource.currency
  goods:
    - resource: example.resource.c
      buy_from_exchange: { base_price: 12000, enabled: true }
      sell_to_exchange:  { base_price: 8000,  enabled: true }
  elasticity:
    window_ticks: 600
    step_quantity: 100000
    step_change_permille: 20
    recovery_permille_per_interval: 50
    recovery_interval_ticks: 60
    min_price_permille: 100
    max_price_permille: 5000
  shared_between_owners: true
```

`elasticity` is required. For every good, `sell_to_exchange.base_price` must be lower than `buy_from_exchange.base_price`.

### 6.22 Owner deficit policy

```yaml
deficit_policy:
  id: example.deficit.default
  resource: example.resource.currency
  trigger: { operator: less, value: 0 }
  action: pause_entities
  order: [maintenance_desc, entity_id_asc]
  stop_when: net_rate_non_negative
  exclude_tags: [example.tag.hub]
  resume:
    policy: automatic_reverse_order
    when: { operator: greater_equal, value: 0 }
```

### 6.23 Optional modules

Optional modules are separate packages of type `simulation_module`. They may reference core definitions but may not modify them.

```yaml
scenario_objective:
  id: example.objective.hold_tier_4
  condition:
    all:
      - sustained:
          ticks: 36000
          condition:
            greater_equal:
              left: { population_count: { scope: owner, tier: example.population.tier_4 } }
              right: 500
      - greater_equal:
          left: { owner_balance: example.resource.currency }
          right: 0
  on_success: emit_scenario_result
  session_end: false
```

```yaml
disruption:
  id: example.disruption.outage
  seed_stream: disruptions
  mean_interval_ticks: 6000
  target_selector: { by_tag: example.tag.producer }
  effect: { type: disable_entity, duration_ticks: 120 }
```

---

## 7. Conditions and Expression Language

### 7.1 Principles

- Typed
- Deterministic
- Side-effect free
- Compiled at load time
- No arbitrary script execution
- Explicit scope

### 7.2 Operators

Boolean:

```text
all, any, not
```

Comparison:

```text
equal, not_equal, greater, greater_equal, less, less_equal
```

Arithmetic:

```text
add, subtract, multiply, divide, min, max, clamp
```

Aggregation:

```text
sum, count, average, minimum, maximum
```

Temporal:

```text
sustained (inner condition continuously true for N ticks)
```

Selectors:

```text
by_id, by_tag, in_entity, in_location, in_region, in_connected_group, in_owner, global
```

Domain queries (examples):

```text
population_count, residence_population, need_category_fulfillment,
aggregate_need_fulfillment, satisfaction_band, location_property,
knowledge_state, owner_balance, owner_net_rate, exchange_price
```

`sustained` timers are authoritative runtime state and are saved.

### 7.3 Condition example

```yaml
condition:
  id: example.condition.advance_1_to_2
  expression:
    all:
      - greater_equal:
          left:
            residence_population: current_entity
          right: 10
      - sustained:
          ticks: 60
          condition:
            greater_equal:
              left:
                aggregate_need_fulfillment: current_entity
              right: 800
      - greater_equal:
          left:
            population_count:
              scope: owner
              tier: example.population.tier_1
          right: 100
```

### 7.4 State-query extension

New query operators require framework extension and schema versioning. Content packages may compose existing operators but may not inject executable code into authoritative conditions.

---

## 8. Curves

Supported curve types:

- Constant
- Piecewise linear
- Step
- Lookup table

```yaml
curve:
  id: example.curve.need_output
  type: piecewise_linear
  points:
    - [0, 0]
    - [500, 500]
    - [800, 1000]
    - [1000, 1200]
```

Inputs and outputs are fixed-scale integers. Extrapolation policy must be `clamp`, `linear`, or `error`.

---

## 9. Transport-Order Runtime Configuration

Transport orders are runtime state created through commands, but route templates may be content definitions.

```yaml
transport_order_template:
  id: example.route.default
  mode: route
  failure_policies:
    origin_unavailable: retry
    destination_unavailable: wait
    path_unavailable: replan
    cargo_cannot_unload: retain
    exchange_limit_not_met: skip
    establishment_target_occupied: return
  scheduling:
    repeat: true
    retry_interval_ticks: 20
```

A runtime route is a station list; each station lists `load`, `unload`, `buy`, or `sell` actions with a quantity rule (`fixed`, `up_to_capacity`, `all`, `excess_above`, `deficit_below`, `maintain_origin_minimum`, `maintain_destination_target`, `priority_list`) and, for trade actions, a price limit.

---

## 10. Presentation References

Simulation definitions may contain only an optional stable `presentation_key`. They may not contain client asset paths.

Presentation packages map keys or definition IDs to localization, icons, models, sounds, animations, display categories, and formatting.

---

## 11. Validation Pipeline

### 11.1 Package validation

- Manifest schema
- Dependency availability
- Semantic-version compatibility
- Duplicate package IDs
- File checksums

### 11.2 Schema validation

- Required fields
- Primitive types
- Ranges
- Enumerations
- Identifier format
- Unknown fields according to strictness mode

### 11.3 Reference validation

- Every ID reference resolves
- Referenced type matches expected type
- Scope combinations are legal
- Presentation references are optional and non-authoritative

### 11.4 Composition validation

- Include graph is acyclic
- Merge operations are valid
- Required components remain after resolution
- Component combinations are compatible

### 11.5 Dependency graph validation

Production graph:

- Required resources have sources
- Recipe cycles require a valid seed path
- No impossible output storage rule

Population graph:

- Need references are valid
- Target tiers and residence definitions exist
- Transitions are reachable unless explicitly marked optional

Spatial/logistics graph:

- Required location resources can reach consumers through compatible connections and transport
- Endpoint and unit tags are compatible
- Distribution rules hold for all location templates
- Establishment costs are transportable and producible

Exchange graph:

- Every exchange defines elasticity
- No good can be bought and immediately resold at a profit
- Exchanges are reachable through connections

Unlock graph:

- Initial content is sufficient to begin
- Unlock dependencies are reachable
- Unapproved cycles are errors

### 11.6 Economic diagnostics

Warnings or configurable errors:

- Guaranteed capability deficit
- Guaranteed negative maintenance balance
- Need consumption with inadequate maximum production
- Transport throughput below required equilibrium
- Storage capacity below one production batch
- Transition requires content unlocked by its own target tier
- Recipe output sellable above input purchase cost at base prices (exchange arbitrage risk)

### 11.7 Design-intent diagnostics

These checks report whether the core design ideas of the Core Game Framework GDD are active. They are warnings by default and may be promoted to errors for complete-game packages:

- **Scarcity coverage:** reports which of the seven scarcities (finite space, finite slots, disjoint distribution, exact capability binding, throughput limit, maintenance while idle, asymmetric decline) are inactive
- **Self-sufficiency:** a single location or region can produce every resource required by all needs
- **Cross-region dependency:** the highest tier's needs are satisfiable without inter-region transport
- **Pyramid bypass:** a higher tier's capability can satisfy a lower tier's requirement, or no producer requires the lowest tier's capability
- **Breadth/depth collapse:** a weighted category has only one member, or all members carry equal weight
- **Coverage absence:** no need is satisfied by spatial coverage
- **Idle-cost absence:** all maintenance uses `while_processing`
- **Decline symmetry:** decline refunds at least the advancement cost or retains excess population
- **Unbounded trade:** an exchange can absorb unlimited volume without price change
- **Ratio legibility:** a chain's integer entity ratio requires more than a configured number of entities per stage

### 11.8 Determinism validation

Reject:

- Wall-clock expressions
- Unseeded random operators
- Platform-dependent numeric values
- Arbitrary executable scripts
- Order-dependent queries without stable ordering
- Optional-module packages that modify core definitions

---

## 12. Package Loading Order

1. Resolve manifests and dependency versions.
2. Load framework schemas.
3. Parse package files.
4. Validate IDs and primitive schemas.
5. Apply includes and merge operations.
6. Resolve references.
7. Compile conditions and curves.
8. Build tag and dependency indexes.
9. Run graph and economic validation.
10. Normalize to canonical representation.
11. Compute configuration checksum.
12. Construct immutable runtime registries.

---

## 13. Versioning and Migration

### 13.1 Compatibility

- Patch: compatible balance or presentation changes.
- Minor: additive definitions or optional fields.
- Major: breaking schema or semantic changes.

### 13.2 ID aliases

```yaml
migration:
  id_aliases:
    example.resource.old_a: example.resource.a
```

### 13.3 Data transforms

Migrations may:

- Rename fields
- Replace definition IDs
- Add defaults
- Transform component layout
- Convert scales

Migrations may not silently discard authoritative state without an explicit policy and diagnostic.

---

## 14. Complete Minimal Framework Example

The following configuration creates a fully closed economic loop with one tier.

```yaml
resources:
  - id: demo.resource.source
    tags: [storable]
    quantity: { precision: fixed, scale: 1000 }
    storage: { policy: normal, scope: inventory }
    transportable: true

  - id: demo.resource.need
    tags: [storable]
    quantity: { precision: fixed, scale: 1000 }
    storage: { policy: normal, scope: inventory }
    transportable: true

  - id: demo.capability.tier_1
    tags: [virtual, capability]
    quantity: { precision: integer, scale: 1 }
    storage: { policy: recomputed, scope: location }
    transportable: false

location_templates:
  - id: demo.location.a
    spatial_policy: framework.spatial.abstract_capacity
    spatial_parameters: { total_capacity: 100 }
    inventories:
      - id: shared
        capacity: { mode: total, quantity: 1000000 }
        access_policy: framework.inventory.shared_location
    activation: { initial: true }

recipes:
  - id: demo.recipe.need
    mode: batch
    duration_ticks: 10
    inputs:
      - { resource: demo.resource.source, quantity: 1000 }
    outputs:
      - { resource: demo.resource.need, quantity: 1000 }
    capability_requirements:
      - { resource: demo.capability.tier_1, quantity: 1 }

population_tiers:
  - id: demo.population.tier_1
    need_categories: [demo.need_category.base]
    outputs:
      - resource: demo.capability.tier_1
        scope: location
        rate_per_population_per_tick: 1

need_categories:
  - id: demo.need_category.base
    evaluation: { mode: all }
    members:
      - { need: demo.need.base, weight: 1000 }

needs:
  - id: demo.need.base
    category: demo.need_category.base
    applies_to: [demo.population.tier_1]
    demand:
      type: resource_consumption
      resource: demo.resource.need
      quantity_per_population_per_tick: 1
    fulfillment:
      measurement_window_ticks: 10
      target_ratio: 1000

entity_definitions:
  - id: demo.entity.source
    components:
      resource_source:
        policy: infinite_rate
        outputs:
          - { resource: demo.resource.source, quantity_per_tick: 1000 }
      storage_access: { inventory: location.shared }

  - id: demo.entity.producer
    components:
      producer:
        recipes: [demo.recipe.need]
        process_slots: 1
        input_inventory: location.shared
        output_inventory: location.shared

  - id: demo.entity.residence
    components:
      residence:
        population_tier: demo.population.tier_1
        capacity: 10
        initial_population: 1
        growth_policy: demo.growth.default

growth_policies:
  - id: demo.growth.default
    interval_ticks: 10
    increase:
      quantity: 1
      condition: demo.condition.grow

conditions:
  - id: demo.condition.grow
    expression:
      all:
        - greater_equal:
            left:
              aggregate_need_fulfillment: current_entity
            right: 800
        - greater:
            left:
              available_population_capacity: current_entity
            right: 0
```

A logistics extension would place the source in a second location and connect the locations with endpoints and transport.

A complete-game package additionally defines the elements listed in the Core Game Framework GDD, "Complete game loop" and "Minimum playable prototype". The GDD's Appendix B provides a non-normative reference parameter set that such a package can implement directly.

---

## 15. Authoring Acceptance Criteria

A content author can create a new game definition without source changes by defining:

- Resources, balance resources, and capabilities
- Regions, distribution rules, locations, connections, and a world definition
- Entities through components
- Services
- Recipes
- Population tiers
- Needs, categories, and satisfaction bands
- Growth and transitions
- Transport units and order templates
- Exploration and establishment rules
- Exchanges with elasticity
- Maintenance and deficit policies
- Unlock conditions
- Optional modules
- Optional presentation package

The validator provides actionable errors for every unresolved reference, invalid graph, incompatible scope, and determinism violation, and reports which core design ideas a package leaves inactive.
