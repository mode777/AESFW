# validation Specification

## Purpose

The validation stage of the content pipeline: after composition, the composed definition set is checked as a graph system — composition compatibility, production, population, spatial/logistics, exchange, and unlock graphs (CONT-11.4, CONT-11.5, CONT-12 step 9). Later M10 rows extend this capability with economic diagnostics (10.2), design-intent diagnostics (10.3), determinism validation (10.4), and presentation-package validation (10.5).

## Requirements

### Requirement: Validation stage placement
The content pipeline SHALL run graph validation over the composed definition set after composition and before registry compilation (CONT-12 order), concatenating its diagnostics with the other stages. An error-severity graph diagnostic SHALL make `loadContent` return `content: null`.

Source: CONT-11.4, CONT-11.5, CONT-12

#### Scenario: A valid package passes the graph stage
- **WHEN** a closed, sourced, reachable package is loaded
- **THEN** the graph stage reports no diagnostics and content is returned

#### Scenario: A graph error fails the load
- **WHEN** a package contains a resource with no source
- **THEN** `loadContent` returns `content: null` with the error diagnostic

### Requirement: Composition compatibility
After composition, every definition SHALL satisfy its collection schema again — required fields removed by merge operations SHALL be reported as `composition_schema_violation` naming the definition and path. Component combinations SHALL be compatible: a `producer` component with an empty `recipes` list SHALL be reported as `incompatible_components`, and a `service_provider` whose `capability` does not name a capability-tagged resource SHALL be reported as `incompatible_components`.

Source: CONT-11.4

#### Scenario: A merge that removes a required field is reported
- **WHEN** merge operations leave a composed definition without a schema-required field (an unlock whose `targets` list a `remove` directive empties)
- **THEN** validation reports `composition_schema_violation` naming the definition and path

#### Scenario: A producer without recipes is reported
- **WHEN** an entity definition declares a `producer` component with `recipes: []`
- **THEN** validation reports `incompatible_components` naming the entity

#### Scenario: A service provider without a capability resource is reported
- **WHEN** a `service_provider.capability` names a resource without the `capability` tag
- **THEN** validation reports `incompatible_components` naming the entity

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

### Requirement: Population graph
Validation SHALL build the tier graph whose edges are advancement transitions and SHALL report `transition_unreachable` for a transition whose source tier is not reachable from a root tier — a tier with no incoming advancement transition — unless the transition is explicitly marked `optional`.

Source: CONT-11.5

#### Scenario: A reachable transition chain passes
- **WHEN** tiers T1 → T2 → T3 are connected by advancement transitions
- **THEN** validation reports no `transition_unreachable` findings

#### Scenario: An orphan transition is reported
- **WHEN** a transition's source tier has no path from any root tier
- **THEN** validation reports `transition_unreachable` naming the transition

#### Scenario: An optional orphan transition is accepted
- **WHEN** an unreachable transition is marked `optional: true`
- **THEN** validation reports no `transition_unreachable` finding for it

### Requirement: Spatial and logistics graph
For each world and each resource consumed at a location by an instantiated entity definition (world `initial_entities`) but neither produced, sourced, population-output, exchange-offered, owner-balanced, nor world-seeded at that location, validation SHALL report `resource_unreachable` when the resource is not transportable or no connection path exists from a location that produces or sources it, or when no transport unit can carry the resource. When a structural path exists but no transport unit's movement tags permit it against the path's `allowed_transport_tags` (mirroring the route planner's compatibility rule), validation SHALL report `transport_tag_mismatch`. An establishment cost resource that is not transportable SHALL be reported as `establishment_cost_invalid`; its sourcing half applies to packages that declare a world.

Source: CONT-11.5, ARCH-14.3

#### Scenario: A non-transportable resource consumed elsewhere is reported
- **WHEN** a location's entity consumes a non-transportable resource produced only at another location
- **THEN** validation reports `resource_unreachable` naming the resource and world

#### Scenario: A reachable transported resource passes
- **WHEN** a consumed resource is produced at a connected location and a transport unit accepts it
- **THEN** validation reports no spatial findings

#### Scenario: Incompatible connection tags are reported
- **WHEN** the only path uses tagged connections and no transport unit's `allowed_connection_tags` matches
- **THEN** validation reports `transport_tag_mismatch`

#### Scenario: An establishment cost that cannot be shipped is reported
- **WHEN** an establishment costs a non-transportable resource
- **THEN** validation reports `establishment_cost_invalid` naming the establishment

### Requirement: Exchange graph
An exchange whose location is declared in a world with other locations but has no incident connection SHALL be reported as `exchange_unreachable`. An exchange at the only location of its world, or an exchange not placed in any world, passes this check. Elasticity and arbitrage rules remain owned by the exchange-definition requirements.

Source: CONT-11.5

#### Scenario: An isolated exchange is reported
- **WHEN** an exchange's location has no connection in a multi-location world
- **THEN** validation reports `exchange_unreachable` naming the exchange

#### Scenario: A connected exchange passes
- **WHEN** the exchange's location has an incident connection
- **THEN** validation reports no `exchange_unreachable` finding

### Requirement: Unlock graph
Validation SHALL connect an unlock to every unlock that exposes a definition its condition depends on (`population_count` or `residence_population` of a tier, or an availability reference to an entity definition) and SHALL report `unlock_cycle` for an unlock that participates in a dependency cycle, including a self-dependent unlock. A package in which every entity definition is a target of some unlock SHALL be reported as `no_initial_content`.

Source: CONT-11.5

#### Scenario: A self-dependent unlock is reported
- **WHEN** an unlock's condition counts the population of the only tier its own targets expose
- **THEN** validation reports `unlock_cycle` naming the unlock

#### Scenario: An acyclic unlock chain passes
- **WHEN** unlock B depends on unlock A and A depends on nothing
- **THEN** validation reports no `unlock_cycle` finding

#### Scenario: A package with no initial entity is reported
- **WHEN** every entity definition in the package is targeted by an unlock
- **THEN** validation reports `no_initial_content`

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

### Requirement: Design-intent stage and promotion
The validation stage SHALL implement the CONT-11.7 design-intent checks over the composed definition set, controlled by the loader option `design_intent: 'off' | 'warning' | 'error'` (default `'off'`). When enabled, every design-intent finding SHALL have warning severity, or error severity when the option is `'error'`; error-severity findings SHALL make `loadContent` return `content: null`. When the option is `'off'`, no design-intent diagnostic SHALL be emitted.

Source: CONT-11.7

#### Scenario: Disabled by default
- **WHEN** a package is loaded without loader options
- **THEN** no design-intent diagnostic is reported

#### Scenario: Warnings when enabled
- **WHEN** a package that omits a design idea is loaded with `design_intent: 'warning'`
- **THEN** the load succeeds and the findings have warning severity

#### Scenario: Promoted findings fail the load
- **WHEN** a package that omits a design idea is loaded with `design_intent: 'error'`
- **THEN** the findings have error severity and `loadContent` returns `content: null`

### Requirement: Scarcity coverage report
When design-intent checks are enabled, validation SHALL evaluate the seven scarcities of GDD-3.2 — finite space, finite source slots, disjoint source distribution, exact workforce-class binding, throughput limit, maintenance while idle, and asymmetric decline — against the composed definitions and SHALL report `inactive_scarcities` listing every inactive scarcity when at least one is inactive. A scarcity is active when: finite space — a location template declares a finite capacity; finite source slots — a source is slot- or area-dependent or a deposit depletes; disjoint distribution — a distribution rule is declared; exact binding — a recipe declares a capability requirement and no capability declares substitutes; throughput limit — a location template declares internal logistics; maintenance while idle — a maintenance charge policy is not `while_processing`; asymmetric decline — a declared decline transition refunds nothing.

Source: CONT-11.7, GDD-3.2

#### Scenario: A package missing scarcities is reported
- **WHEN** a package with design-intent enabled declares no distribution rules and no decline transitions
- **THEN** validation reports `inactive_scarcities` naming `disjoint_distribution` and `asymmetric_decline`

#### Scenario: A package with all scarcities active is clean
- **WHEN** a package activates all seven scarcities
- **THEN** validation reports no `inactive_scarcities` finding

### Requirement: Self-sufficiency and cross-region dependency
When design-intent checks are enabled, validation SHALL report `self_sufficient_region` when a single region (or single-location world) can produce every resource any need demands, and `cross_region_absent` when every demand resource of the highest tier can be produced within one region of a multi-region world, so that no inter-region transport is forced.

Source: CONT-11.7, GDD-3.3

#### Scenario: A self-sufficient region is reported
- **WHEN** one region of a world produces every demanded resource
- **THEN** validation reports `self_sufficient_region` naming the region

#### Scenario: A cross-region-dependent top tier passes
- **WHEN** the highest tier's demanded resources originate in more than one region
- **THEN** validation reports no `cross_region_absent` finding

#### Scenario: A top tier servable from one region is reported
- **WHEN** all of the highest tier's demand resources are produced within one region
- **THEN** validation reports `cross_region_absent` naming the tier and region

### Requirement: Pyramid, breadth, and coverage intent
When design-intent checks are enabled, validation SHALL report `pyramid_bypass` when a capability declares substitutes or no recipe declares a capability requirement; `breadth_depth_collapse` when a weighted-score category has a single member or all members carry equal weight; and `coverage_absent` when no need demands spatial coverage.

Source: CONT-11.7, GDD-3.4, GDD-3.5, GDD-3.6

#### Scenario: A substitute capability is reported
- **WHEN** a capability resource lists another capability in `substitutes`
- **THEN** validation reports `pyramid_bypass` naming the resource

#### Scenario: A collapsed weighted category is reported
- **WHEN** a weighted-score category has one member or equal member weights
- **THEN** validation reports `breadth_depth_collapse` naming the category

#### Scenario: A package without coverage needs is reported
- **WHEN** no need in the package demands spatial coverage
- **THEN** validation reports `coverage_absent`

#### Scenario: Intent-bearing content is clean
- **WHEN** exact capabilities with weighted multi-member categories and a coverage need are present
- **THEN** validation reports none of these diagnostics

### Requirement: Idle cost, decline symmetry, trade bounds, and ratio legibility
When design-intent checks are enabled, validation SHALL report `idle_cost_absent` when no maintenance charge policy differs from `while_processing`; `decline_symmetric` when a decline transition refunds its advancement costs or retains the population; `unbounded_trade` when an enabled exchange good has a zero step change; and `ratio_illegible` when a production stage's entity ratio exceeds the loader's configured threshold.

Source: CONT-11.7, GDD-3.7

#### Scenario: Idle-cost-free maintenance is reported
- **WHEN** every maintenance charge policy is `while_processing`
- **THEN** validation reports `idle_cost_absent`

#### Scenario: A symmetric decline is reported
- **WHEN** a decline transition refunds the advancement costs or retains the population
- **THEN** validation reports `decline_symmetric` naming the transition

#### Scenario: An unbounded good is reported
- **WHEN** an enabled exchange good declares a zero step change
- **THEN** validation reports `unbounded_trade` naming the exchange and good

#### Scenario: An illegible ratio is reported
- **WHEN** a production stage requires more entities than the configured threshold
- **THEN** validation reports `ratio_illegible` naming the stage

#### Scenario: Asymmetric bounded content is clean
- **WHEN** idle costs, unrefunded declines, stepped prices, and legible ratios are present
- **THEN** validation reports none of these diagnostics

### Requirement: Determinism validation
The content pipeline SHALL validate determinism over raw definition documents before composition (CONT-12 order) and SHALL report error-severity diagnostics for: a condition expression using a wall-clock operator (`now`, `date`, `time`, `clock`) as `wall_clock_expression`; a condition expression using a random operator (`random`, `rng`, `randint`) as `unseeded_random`; a definition number that is not a safe integer as `platform_numeric`; a string inside a condition expression containing executable-code markers (`=>`, `function`, `eval(`, `new Date`) as `executable_script`; and an `optional_module` package defining an ID from the `framework.` namespace or an ID defined by a non-module package in the same load as `module_redefines_core`. Each diagnostic names its package and file.

Source: CONT-11.8

#### Scenario: A wall-clock expression is rejected
- **WHEN** a condition expression uses a `now` operator
- **THEN** validation reports `wall_clock_expression` naming the package, file, and condition

#### Scenario: An unseeded random operator is rejected
- **WHEN** a condition expression uses a `random` operator
- **THEN** validation reports `unseeded_random` naming the package, file, and condition

#### Scenario: A platform-dependent number is rejected
- **WHEN** a definition carries a non-safe-integer number such as `0.1`
- **THEN** validation reports `platform_numeric` naming the package, file, and path

#### Scenario: An embedded script is rejected
- **WHEN** a condition expression string contains `=>` or `eval(`
- **THEN** validation reports `executable_script` naming the package, file, and condition

#### Scenario: A module redefining core content is rejected
- **WHEN** an optional-module package defines a `framework.` ID or an ID owned by a simulation-content package
- **THEN** validation reports `module_redefines_core` naming the module and the ID

#### Scenario: Deterministic content passes
- **WHEN** a package uses only safe integers and known operators
- **THEN** no determinism diagnostic is reported
