# sim/needs Specification

## Purpose

The need framework: per-residence need demand, delivery from accessible inventories, fulfillment measured over a window, category aggregation under every mode, and residence satisfaction `Z`, all bounded to `[0, 1000]` (GDD-12, INV-08).

## Requirements

### Requirement: Need and category specification
A residence SHALL carry its needs and categories. A need SHALL carry its category, type (`resource_consumption` or `resource_availability`), resource, per-capita per-tick demand, measurement window length, and target ratio. A category SHALL carry its mode (`all`, `any`, `count`, `weighted_score`, `average`, or `minimum`), its required score, and its weighted members.

Source: GDD-12.1, GDD-12.3

#### Scenario: A residence carries its needs and categories
- **WHEN** a residence with one resource-consumption need and one weighted-score category is created
- **THEN** reading it returns the need and the category

### Requirement: Need state and satisfaction state
A `needStates` component SHALL carry, per need in ascending need handle, the demanded amount and a delivery window of the last `measurement_window_ticks` delivered amounts. A `satisfaction` component SHALL carry the fulfillment of every active category and the residence satisfaction `Z`.

Source: GDD-12.4, GDD-12.5

#### Scenario: Need state starts empty
- **WHEN** a residence with a need is created
- **THEN** its need state has demand `0` and an empty window

### Requirement: Population demand
Phase 08 SHALL, for each residence in ascending entity ID, compute each need's raw demand as `floor(quantity_per_population_per_tick × count × consumption_factor / 1000)` and store it in the need state.

Source: GDD-12.4, GDD-4.2

#### Scenario: Demand scales with population
- **WHEN** a residence with count `10`, per-capita demand `2`, and consumption factor `1000` is evaluated
- **THEN** its demand is `20`

#### Scenario: The consumption factor scales demand
- **WHEN** the same residence has consumption factor `2000`
- **THEN** its demand is `40`

### Requirement: Need delivery
Phase 20 SHALL, for each residence in ascending entity ID, deliver each need from the inventories accessible through `shared_location`. A `resource_consumption` need SHALL consume the delivered amount from those inventories; a `resource_availability` need SHALL test availability without consuming. The delivered amount SHALL NOT exceed the demand. When the residence is at a throughput-limited location, the delivered amount SHALL be `floor(availableDelivery × throttle_permille / 1000)`, using the residence's granted throughput. It SHALL append the delivered amount to the need window and trim the window to its length.

Source: GDD-12.2, GDD-12.4, ARCH-12, GDD-15.1

#### Scenario: A consumption need consumes its resource
- **WHEN** a residence demands `20` and its location holds `50`
- **THEN** `20` is consumed, `30` remains, and the window records `20`

#### Scenario: Delivery is limited by availability
- **WHEN** a residence demands `20` and its location holds `5`
- **THEN** `5` is consumed and the window records `5`

#### Scenario: An availability need does not consume
- **WHEN** an availability need is delivered
- **THEN** the inventory quantity is unchanged

#### Scenario: A throttled need delivery consumes less
- **WHEN** a residence can receive `400` and its throughput throttle is `250` permille
- **THEN** phase 20 delivers and consumes `100`

#### Scenario: An unthrottled need delivery is unchanged
- **WHEN** a residence is at a location without throughput limiting and can receive `400`
- **THEN** phase 20 delivers and consumes `400`

### Requirement: Fulfillment and category aggregation
Phase 21 SHALL compute each need's fulfillment as `min(1000, floor(1000 × Σwindow / (demand × window length)))`, or `1000` when the demand or window is empty. It SHALL aggregate each active category under its mode: `all` takes the minimum member fulfillment, `any` the maximum, `average` the mean, `minimum` the minimum, `count` the proportion of members at or above the target ratio up to `required_score`, and `weighted_score` the weighted sum divided by the required score, capped at `1000`.

Source: GDD-12.3, GDD-12.4

#### Scenario: A fully supplied category scores 1000
- **WHEN** every member need of an `all` category is fully delivered
- **THEN** the category fulfillment is `1000`

#### Scenario: Weighted score rewards breadth and depth
- **WHEN** a `weighted_score` category with required score `2000` has one member at fulfillment `1000` with weight `2000`
- **THEN** the category fulfillment is `1000`

#### Scenario: An unmet need lowers the category
- **WHEN** an `all` category has one member at fulfillment `500`
- **THEN** the category fulfillment is `500`

### Requirement: Residence satisfaction
Phase 21 SHALL set residence satisfaction `Z` from the active category fulfillments under the configured aggregation: `average` (the arithmetic mean, the default) or `minimum` (the weakest category).

Source: GDD-12.5

#### Scenario: Satisfaction averages active categories
- **WHEN** two active categories have fulfillments `1000` and `500` under `average`
- **THEN** `Z` is `750`

#### Scenario: Minimum aggregation takes the weakest
- **WHEN** two active categories have fulfillments `1000` and `500` under `minimum`
- **THEN** `Z` is `500`

### Requirement: Fulfillment values are bounded
Every need fulfillment, category fulfillment, and residence satisfaction SHALL lie in `[0, 1000]` (INV-08).

Source: INV-08, GDD-12

#### Scenario: Fulfillment is capped at 1000
- **WHEN** a need's delivered amount exceeds its demand over the window
- **THEN** its fulfillment is `1000`

### Requirement: Service definitions
A service SHALL carry `id`, `mode` (`coverage` or `capacity`), and an optional `default_relation` radius `{ type: radius, cells }` with a positive cell count; a coverage provider without its own relation SHALL use the service's `default_relation`.

Source: CONT-6.12, GDD-9.6

#### Scenario: A coverage service with a default relation compiles
- **WHEN** a package defines `services: [{ id: test.service.market, mode: coverage, default_relation: { type: radius, cells: 6 } }]`
- **THEN** the service compiles with mode `coverage` and the radius relation

#### Scenario: A non-positive radius is rejected
- **WHEN** a service declares `default_relation: { type: radius, cells: 0 }`
- **THEN** the package fails schema validation

### Requirement: Service provider component
An entity definition SHALL declare `service_provider: { mode, service, relation?, capability?, quantity_per_tick?, consumes? }`; instantiation SHALL resolve the service handle and the effective relation (the component's relation, else the service's default). A capacity provider SHALL declare a `capability` resource and a positive `quantity_per_tick`. Providers that are disabled or at an inactive location SHALL not generate coverage or capacity.

Source: CONT-6.8, GDD-9.6, GDD-12.2

#### Scenario: A provider instantiates with the service default relation
- **WHEN** an entity definition declares `service_provider: { mode: coverage, service: test.service.market }` and the service's default relation is radius `6`
- **THEN** the placed entity carries a `serviceProvider` component with service handle and radius `6`

#### Scenario: A disabled provider generates nothing
- **WHEN** a coverage provider is disabled via `SetEntityEnabled`
- **THEN** phase 20 treats the residence as not covered by that provider

### Requirement: Service capacity demand and allocation
A `service_capacity` need SHALL demand `quantity_per_population_per_tick × population` scaled by the tier consumption factor. Phase 20 SHALL allocate each location's generated capacity — the sum of active capacity providers' `quantity_per_tick` for that service at the residence's location — across residences in ascending entity ID, granting `min(remaining, demanded)` per residence.

Source: GDD-12.2, CONT-6.11, ARCH-5.2

#### Scenario: Capacity is allocated in ascending residence order
- **WHEN** a location generates `5` capacity per tick and residences `1` and `2` demand `4` and `3`
- **THEN** residence `1` receives `4` and residence `2` receives `1`

#### Scenario: Unserved capacity demand delivers zero
- **WHEN** no active provider of the service exists at the residence's location
- **THEN** the need delivers `0` for the tick

### Requirement: Spatial coverage delivery
A `spatial_coverage` need SHALL be fully supplied on a tick when at least `required_distinct_providers` active providers of the referenced service cover the residence under their configured radius relation, evaluated with the spatial policy's coverage test; otherwise it SHALL deliver `0`. Coverage SHALL consume no resources.

Source: GDD-3.6, GDD-12.2, CONT-6.11

#### Scenario: One provider satisfies a single-provider coverage need
- **WHEN** a coverage provider with radius `6` stands `4` cells from the residence and the need requires `1` distinct provider
- **THEN** the need delivers its full unit demand

#### Scenario: Coverage outside the radius delivers zero
- **WHEN** the nearest active provider stands `7` cells from the residence with radius `6`
- **THEN** the need delivers `0`

#### Scenario: Distinct providers are required in full
- **WHEN** the need requires `2` distinct providers and only one active provider covers the residence
- **THEN** the need delivers `0`

### Requirement: State query delivery
A `state_query` need SHALL demand a unit supply and SHALL be fully supplied on a tick when its referenced condition evaluates `true` for the residence subject, and `0` otherwise.

Source: GDD-12.2, CONT-6.11, TDS-14.2

#### Scenario: A true condition supplies the need
- **WHEN** the need references a condition whose expression is `true`
- **THEN** the need delivers its full unit demand each tick

#### Scenario: A false condition delivers zero
- **WHEN** the referenced condition evaluates `false` for the residence
- **THEN** the need delivers `0`

### Requirement: Need reference validation
A need's `demand.service` SHALL resolve to a service definition and `demand.condition` SHALL resolve to a condition definition; an unresolved reference SHALL fail the load with the existing unknown-reference diagnostic.

Source: CONT-6.11, CONT-11.3

#### Scenario: An unknown service reference fails the load
- **WHEN** a need declares `demand: { type: spatial_coverage, service: test.service.absent }`
- **THEN** `loadContent` returns an error-severity diagnostic naming the reference
