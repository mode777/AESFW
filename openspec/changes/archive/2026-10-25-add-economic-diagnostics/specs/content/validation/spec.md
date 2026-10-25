# Spec Delta

## MODIFIED Requirements

### Requirement: Production graph
Validation SHALL report `unsourceable_resource` for every resource consumed by a recipe input, maintenance input, construction cost, transition cost, establishment cost, or transport-maintenance input when no recipe output, resource source, population output, exchange buy side, or world initial resource provides it. Owner- and global-scoped resources are balances governed by income and deficit policy, not produced commodities, and are exempt. The sourcing requirement applies to runnable economies — a package that declares no world definition is a definition library and is not judged. A cycle among recipes SHALL be accepted only when at least one member resource has a seed path — a resource source, population output, exchange buy side, or world initial resource; otherwise validation SHALL report `recipe_cycle_unseeded` naming one cycle member. A recipe or resource-source output whose resource uses `recomputed` storage SHALL be reported as `invalid_output_storage`. Need demands are not production-graph consumers; their adequacy is an economic diagnostic (CONT-11.6).

Source: CONT-11.5, CONT-11.6

#### Scenario: A consumed resource with no source is reported
- **WHEN** a package with a world defines a recipe consuming a resource that no recipe, source, population output, exchange, or world initial resource provides
- **THEN** validation reports `unsourceable_resource` naming the resource

#### Scenario: A fully sourced package passes
- **WHEN** every consumed resource has at least one provider
- **THEN** validation reports no `unsourceable_resource` findings

#### Scenario: An owner-scoped balance is exempt
- **WHEN** maintenance consumes an owner-scoped balance resource with no producer
- **THEN** validation reports no `unsourceable_resource` finding

#### Scenario: A definition library without worlds is not judged
- **WHEN** a package declares consumed resources but no world definition
- **THEN** validation reports no `unsourceable_resource` findings

#### Scenario: A seeded recipe cycle is accepted
- **WHEN** recipes form a cycle and one member resource is produced by a resource source
- **THEN** validation reports no cycle diagnostic

#### Scenario: An unseeded recipe cycle is reported
- **WHEN** recipes form a cycle and no member resource has a seed path
- **THEN** validation reports `recipe_cycle_unseeded`

#### Scenario: A recomputed output is reported
- **WHEN** a recipe outputs a resource whose storage policy is `recomputed`
- **THEN** validation reports `invalid_output_storage` naming the recipe

## ADDED Requirements

### Requirement: Economic diagnostics stage
The validation stage SHALL run the CONT-11.6 economic checks after the graph checks over the composed definition set. Every economic finding SHALL have warning severity by default and SHALL be reported with severity `error` instead when the loader option `economic_diagnostics` is `'error'`. Warning-severity findings SHALL never make `loadContent` return `content: null`.

Source: CONT-11.6, CONT-12

#### Scenario: Warnings are reported but the package loads
- **WHEN** a package triggers an economic finding and `economic_diagnostics` is `'warning'`
- **THEN** the load succeeds with a warning-severity diagnostic

#### Scenario: Promoted findings fail the load
- **WHEN** a package triggers an economic finding and `economic_diagnostics` is `'error'`
- **THEN** the diagnostic has error severity and `loadContent` returns `content: null`

#### Scenario: Clean packages report nothing
- **WHEN** a closed, balanced package is loaded
- **THEN** no economic diagnostic is reported

### Requirement: Guaranteed capability and balance deficits
Validation SHALL report `capability_deficit` when a recipe's capability requirement names a capability no population output or resource source produces anywhere. Validation SHALL report `negative_maintenance_balance` when an owner-scoped balance resource is charged by an entity or transport-unit maintenance while no population output, source output, or exchange grants income in that resource.

Source: CONT-11.6

#### Scenario: A capability with no provider is reported
- **WHEN** a recipe requires a capability resource that no tier output or source produces
- **THEN** validation reports `capability_deficit` naming the recipe and capability

#### Scenario: A chargeable balance with no income is reported
- **WHEN** maintenance charges an owner-scoped balance that no output or exchange grants
- **THEN** validation reports `negative_maintenance_balance` naming the resource

#### Scenario: An income-bearing balance passes
- **WHEN** a balance is charged by maintenance and a population output grants it income
- **THEN** validation reports no `negative_maintenance_balance` finding

### Requirement: Inadequate production and throughput
Validation SHALL report `inadequate_production` when a need's `quantity_per_population_per_tick` exceeds the maximum static production rate of its demand resource (source outputs plus one-instance recipe throughput). Validation SHALL report `throughput_below_equilibrium` when a world must import a consumed resource and the round-trip capacity of the transport units that can carry it is below the importing location's demand rate.

Source: CONT-11.6

#### Scenario: A need whose demand outruns production is reported
- **WHEN** a need demands `5` per inhabitant per tick of a resource whose sources supply `2` per tick
- **THEN** validation reports `inadequate_production` naming the need

#### Scenario: A balanced need passes
- **WHEN** production capacity meets or exceeds the demand rate
- **THEN** validation reports no `inadequate_production` finding

#### Scenario: Import demand above carrier capacity is reported
- **WHEN** a location imports a resource whose consumers demand more per tick than the carriers' round-trip capacity
- **THEN** validation reports `throughput_below_equilibrium` naming the world and resource

### Requirement: Storage, transition, and arbitrage diagnostics
Validation SHALL report `storage_below_batch` when a producer's referenced inventory capacity holds less than one batch of its recipe's inputs or outputs. Validation SHALL report `transition_self_lock` when a transition's cost resource is produced only by content of its own target tier. Validation SHALL report `exchange_arbitrage_risk` when a recipe's inputs are all exchange-buyable and the base-price sale value of its outputs is not below the base-price purchase value of its inputs.

Source: CONT-11.6

#### Scenario: An inventory too small for a batch is reported
- **WHEN** a producer's input inventory holds less than its recipe's input quantity
- **THEN** validation reports `storage_below_batch` naming the entity

#### Scenario: A transition locked by its own target is reported
- **WHEN** a transition's cost resource is produced only by its target tier's output
- **THEN** validation reports `transition_self_lock` naming the transition

#### Scenario: A recipe-mediated arbitrage loop is reported
- **WHEN** a recipe buys all inputs from an exchange and sells its output above the input cost
- **THEN** validation reports `exchange_arbitrage_risk` naming the recipe

#### Scenario: A balanced production chain reports nothing
- **WHEN** storage, transitions, and exchange prices do not admit the conditions above
- **THEN** validation reports none of these diagnostics
