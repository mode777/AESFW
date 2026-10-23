# Spec Delta

## Purpose

Services (GDD-9.6) let a need be satisfied through generated capacity or through spatial coverage instead of resource flow (GDD-3.6), and the `state_query` supplier type lets a need evaluate a condition directly.

## ADDED Requirements

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
