# app/projections Specification

## Purpose

Per-actor projections, delta computation, and delta application for the presentation contract (TDS-18.4, PIC-9, PIC-18), with per-actor fog filtering of projections, read models, and events (ARCH-8.3, PIC-9.3).

## Requirements

### Requirement: Full projection
`project(session, actor)` SHALL build the projection per actor: a location whose knowledge state for the actor is `unknown` SHALL carry only its entity ID, `knowledge: unknown`, an empty inventory list, and its connections; a discovered or established location SHALL carry its full attributes. Entities at locations unknown to the actor SHALL be omitted. When the session's `fog` setting is disabled, the projection SHALL be unfiltered.

Source: PIC-9.1, PIC-9.3, ARCH-8.3, TDS-18.4, GDD-16.1

#### Scenario: A projection contains the owner, location, and entity
- **WHEN** the projection is built for an actor with full knowledge
- **THEN** it contains the owner, every location with its attributes, and every entity

#### Scenario: An unknown location exposes only its identity
- **WHEN** the projection is built for an actor that has not discovered a location
- **THEN** that location's DTO carries its entity ID, `knowledge: unknown`, and connections, and omits its definition, owner, active state, properties, throughput, grid, and inventories

#### Scenario: Foreign entities at unknown locations are omitted
- **WHEN** an entity's location is unknown to the actor
- **THEN** the projection contains no entry for that entity

#### Scenario: Disabling fog restores the full projection
- **WHEN** the session is created with `fog: false`
- **THEN** unknown locations carry their full attributes

### Requirement: Projection delta
`diffProjection(prev, next)` SHALL diff the locations of the two same-actor projections and report each location whose filtered DTO changed as a whole entry in an additive `location_updates` list, alongside the entity, inventory, and owner updates; `applyDelta` SHALL replace the changed location entries. A `LocationDiscovered` event is therefore followed by the newly visible attributes in the next delta.

Source: PIC-9.2, PIC-9.3, TDS-18.4

#### Scenario: A discovery re-sends the location
- **WHEN** the next projection after a `LocationDiscovered` event is diffed against the previous one
- **THEN** the delta's `location_updates` contain the location with its newly visible attributes

#### Scenario: An unchanged location is not re-sent
- **WHEN** two consecutive projections carry the same filtered location DTO
- **THEN** the delta contains no entry for that location

### Requirement: Delta application
`applyDelta(base, delta)` SHALL return a new `SnapshotDto` equal to the projection the delta was computed against, by applying every `entity_update` and `inventory_update` to a copy of `base` and setting `revision` to `delta.to_revision` and `tick` to `delta.tick`. It SHALL leave entries the delta does not mention unchanged. Property P-10 SHALL hold: applying `diffProjection(p_n, p_{n+1})` to `p_n` yields `p_{n+1}` exactly.

Source: PIC-18, 06 §9 P-10

#### Scenario: Applying a delta round-trips
- **WHEN** `applyDelta(p_n, diffProjection(p_n, p_{n+1}))` is computed
- **THEN** it deep-equals `p_{n+1}`

#### Scenario: A delta for another base is not applicable
- **WHEN** `canApplyDelta(base, delta)` is called with a `delta.from_revision` different from `base.revision`
- **THEN** it returns `false`

### Requirement: Resynchronization rule
`canApplyDelta(base, delta)` SHALL return `true` only when `delta.session_id` equals `base.session_id` and `delta.from_revision` equals `base.revision`. When it returns `false`, the client SHALL request a full snapshot and replace its projection (PIC-18).

Source: PIC-18, ARCH-8.2

#### Scenario: A matching base can apply
- **WHEN** a delta with `from_revision` `5` is checked against a projection with `revision` `5`
- **THEN** `canApplyDelta` returns `true`

#### Scenario: A mismatched session cannot apply
- **WHEN** a delta from `session.2` is checked against a projection from `session.1`
- **THEN** `canApplyDelta` returns `false`

### Requirement: Definition metadata read model
`definitionMetadata(content, type)` SHALL return one `DefinitionMetadataDto` per compiled definition of `type`, ordered by ascending definition ID, carrying the definition's string ID, its type, its tags, its data as `parameters`, and an empty `commands` list. It SHALL NOT expose behaviour a client could mistake for authority.

Source: PIC-4, TDS-18.4

#### Scenario: Entity metadata carries its tags
- **WHEN** the content has one entity definition `test.entity.residence` tagged `test.tag.a`
- **THEN** `definitionMetadata(content, 'entity')` returns one entry with `definition_id` `test.entity.residence` and `tags` `['test.tag.a']`

### Requirement: Entity detail read model
`entityDetail(session, entity)` SHALL return an `EntityDetailDto` for an entity that has a `definition` component, a producer, or a residence, and `null` otherwise. The DTO SHALL carry the entity ID, definition ID, lifecycle (`active` when unset), location, owner, `enabled` (`true` when unset), the four available commands, production state and block reasons when the entity is a producer, and the population, satisfaction, and band when the entity is a residence. When the entity is listed in its owner's `deficitPaused` state, the DTO SHALL set `paused_by_deficit: true` and include `ResumeDeficitPausedEntities` in `available_commands`.

Source: PIC-10.1, TDS-18.4

#### Scenario: A residence detail reports its population
- **WHEN** a residence entity with population `50` and satisfaction `800` is inspected
- **THEN** the detail's `residence.population` is `50` and `residence.satisfaction` is `800`

#### Scenario: An unknown entity has no detail
- **WHEN** `entityDetail` is called for an entity with no components
- **THEN** it returns `null`

#### Scenario: A deficit-paused entity reports the pause
- **WHEN** an entity is listed in its owner's `deficitPaused` state
- **THEN** its detail carries `paused_by_deficit: true` and `available_commands` contains `ResumeDeficitPausedEntities`

#### Scenario: A running entity reports no pause
- **WHEN** an entity is not deficit-paused
- **THEN** its detail carries no `paused_by_deficit` field and no resume command

### Requirement: Location summary read model
`locationSummary(session, actor, location)` SHALL return a `LocationSummaryDto` for a location entity and `null` otherwise, carrying knowledge, active state, inventory totals per resource, population totals per tier, an entity count, and the connection list (empty in M2).

Source: PIC-10.2, TDS-18.4

#### Scenario: A location summary totals its population
- **WHEN** a location holds a residence with population `50` of tier `test.tier.a`
- **THEN** the summary's `population_by_tier['test.tier.a']` is `50` and its entity count is `1`

#### Scenario: A non-location has no summary
- **WHEN** `locationSummary` is called for an entity with no location component
- **THEN** it returns `null`

### Requirement: Need breakdown read model
`needBreakdown(session, entity)` SHALL return one `NeedBreakdownDto` per need of a residence, and an empty array otherwise. Each entry SHALL carry the need ID, demand, delivered (the latest window value), fulfillment in permille (`1000` when demand is `0`, otherwise `min(1000, floor(delivered × 1000 / demand))`), the category ID, and the category result.

Source: PIC-10.3, TDS-18.4

#### Scenario: Fulfillment is computed from the window
- **WHEN** a need has demand `1000` and a latest window value of `800`
- **THEN** the breakdown entry's `fulfillment` is `800`

#### Scenario: A non-residence has no needs
- **WHEN** `needBreakdown` is called for a location entity
- **THEN** it returns an empty array

### Requirement: Location grid projection
`project(session, actor)` SHALL set `LocationDto.grid` to `{ width, height, blocked }` for every grid-policy location, where `blocked` lists the packed cell indices (`y * width + x`) in ascending order, and SHALL omit `grid` for an abstract-capacity location. The field is part of the per-actor projection and is subject to fog filtering (PIC-9.3).

Source: PIC-9.1, PIC-9.3, PIC-10.2, CONT-6.4, TDS-18.4

#### Scenario: A grid location exposes its geometry
- **WHEN** a grid location with `width` `4`, `height` `3`, and blocked cells `[1, 6]` is projected
- **THEN** its `grid` is `{ width: 4, height: 3, blocked: [1, 6] }`

#### Scenario: An abstract location omits the grid
- **WHEN** an abstract-capacity location with no grid is projected
- **THEN** its `grid` is `undefined`

#### Scenario: The grid is projected per actor
- **WHEN** the same world is projected for actor `test.owner.1` and for actor `test.owner.2`
- **THEN** both projections carry the location's `grid`

### Requirement: Entity spatial projection
`project(session, actor)` SHALL set `EntityDto.spatial` for an entity carrying a logical transform to `{ logical_position: [x, y], orientation, footprint }`, where `footprint` is `{ width, height }` when the entity has a footprint and is omitted otherwise, and SHALL omit `spatial` for an entity with no logical transform.

Source: PIC-9.1, TDS-18.4, GDD-6.1, ARCH-11

#### Scenario: A placed entity exposes its transform and footprint
- **WHEN** an entity at logical position `[10, 12]`, orientation `1`, and footprint `[2, 3]` is projected
- **THEN** its `spatial` is `{ logical_position: [10, 12], orientation: 1, footprint: { width: 2, height: 3 } }`

#### Scenario: A placed entity without a footprint still exposes its position
- **WHEN** an entity with a logical transform but no footprint component is projected
- **THEN** its `spatial.logical_position` is present and its `spatial.footprint` is `undefined`

#### Scenario: An unplaced entity omits spatial
- **WHEN** an entity with no logical transform is projected
- **THEN** its `spatial` is `undefined`

### Requirement: Entity connectivity projection
`project(session, actor)` SHALL set `EntityDto.connectivity` for an entity carrying a connectivity node to `{ role, network, connected }`, where `role` is `provider` or `requirement`, `network` is the node's network string ID, and `connected` is the core `isConnected` result for the entity, and SHALL omit `connectivity` for an entity with no connectivity node.

Source: PIC-9.1, PIC-10.2, GDD-9.2, GDD-9.9

#### Scenario: A connected requirement is exposed
- **WHEN** an entity carries a `requirement` node for network `test.connectivity.hub` in a location whose hub provides connectivity
- **THEN** its `connectivity` is `{ role: 'requirement', network: 'test.connectivity.hub', connected: true }`

#### Scenario: An unconnected requirement is exposed
- **WHEN** an entity carries a `requirement` node for network `test.connectivity.hub` in a location with no hub and no provider
- **THEN** its `connectivity` is `{ role: 'requirement', network: 'test.connectivity.hub', connected: false }`

#### Scenario: A provider is exposed
- **WHEN** an entity carries a `provider` node for network `test.connectivity.hub`
- **THEN** its `connectivity.role` is `'provider'`

#### Scenario: An entity without a node omits connectivity
- **WHEN** an entity carries no connectivity node is projected
- **THEN** its `connectivity` is `undefined`

### Requirement: Owner balance read model
Each owner entry in the full projection SHALL carry a `balance` object with `revenue_per_interval`, `expenses_per_interval`, and `net_per_interval` as the owner's per-tick income, maintenance expense, and their difference, and `deficit_paused_entities` listing the owner's deficit-paused entities in pause order. It SHALL also carry `revenue_by_source` keyed `tier.<tier id>` (population income by tier), `expenses_by_source` keyed `entity.<entity id>` (per-entity maintenance expense), and `idle_paying_entities` listing charging entities whose producer is not `processing`. All rates are per tick in base units.

Source: PIC-9.1, PIC-10.6, GDD-20.2

#### Scenario: The balance carries revenue, expenses, and pause order
- **WHEN** an owner holds one residence producing `10` per tick of the balance resource and one entity charging `500` per `10` ticks, with one entity deficit-paused after another
- **THEN** the owner's balance reads revenue `10`, expenses `50`, net `-40`, and `deficit_paused_entities` in pause order

#### Scenario: Revenue by source names the tier
- **WHEN** a residence of tier `test.tier.a` produces `10` per tick
- **THEN** `revenue_by_source['tier.test.tier.a']` is `10`

#### Scenario: Expenses by source names the entity
- **WHEN** an entity charges `500` per `10` ticks
- **THEN** `expenses_by_source['entity.<id>']` is `50`

#### Scenario: An idle producer that still pays is listed
- **WHEN** a producer with `charge_policy: while_enabled` is `idle` at an interval boundary
- **THEN** `idle_paying_entities` contains that entity

#### Scenario: A processing producer is not idle-paying
- **WHEN** a producer with `charge_policy: while_enabled` is `processing`
- **THEN** `idle_paying_entities` does not contain that entity

### Requirement: Owner updates in the projection delta
`diffProjection(prev, next)` SHALL include an `owner_updates` entry carrying the full owner entry (resources and balance) for every owner whose projected entry differs between `prev` and `next`, and SHALL omit `owner_updates` (or emit an empty list) when no owner changed.

Source: PIC-9.2, PIC-10.6

#### Scenario: A balance change appears in the delta
- **WHEN** an owner's revenue changes between two projections
- **THEN** the delta's `owner_updates` carries that owner's full entry with the new balance

#### Scenario: An unchanged owner is omitted
- **WHEN** no owner entry changes between two projections
- **THEN** `owner_updates` is empty

### Requirement: Planning net rate
`planningMetrics(session, actor)` SHALL compute, for every resource consumed by a `resource_consumption` need and for the owner scope and each location scope, the nominal net production rate as an exact rational: the sum over the scope's producers of their selected recipe's per-tick output of the resource minus the per-tick inputs of the resource, where a batch recipe's per-tick rate is `quantity / duration_ticks` and a continuous recipe's rate is `quantity` per tick. The read model SHALL report the floored per-tick value.

Source: PIC-10.5, TDS-18.5, GDD-10.6

#### Scenario: The net rate nets outputs against recipe inputs
- **WHEN** two producers each output `30` of `test.r.ore` per `10` ticks and two refiners each consume `20` ore per `10` ticks
- **THEN** the owner-scope net rate for `test.r.ore` is `2` per tick

#### Scenario: A continuous recipe contributes its quantity per tick
- **WHEN** a continuous producer outputs `7` of `test.r.ore` per tick
- **THEN** the owner-scope net rate for `test.r.ore` includes `7` per tick

### Requirement: Supported population per tier
For each consuming tier, the read model SHALL report the per-capita demand — the sum of the tier's need quantities for the resource multiplied by the tier's consumption factor over `1000`, as an exact rational — and the supported population as `floor(net_rate / per_capita)`, clamped to at least `0`. It SHALL also report the tier's current consuming population and a coverage ratio of `floor(population × 1000 / supported)` permille (`0` when supported is `0`).

Source: PIC-10.5, TDS-18.5, GDD-3.8

#### Scenario: Supported population matches the hand calculation
- **WHEN** the net rate of `test.r.metal` is `2` per tick and a tier with consumption factor `1000` consumes `2` per population per tick
- **THEN** the supported population for that tier is `1`

#### Scenario: A negative net rate supports nobody
- **WHEN** the net rate of a resource is negative for a scope
- **THEN** the supported population is `0` for every consuming tier

#### Scenario: The coverage ratio reports over-coverage in permille
- **WHEN** a tier's consuming population is `5` and its supported population is `1`
- **THEN** the coverage ratio is `5000` permille

### Requirement: Chain metrics
For every resource that at least one producer outputs, the read model SHALL report a chain with the producers whose selected recipe outputs or consumes the resource, grouped by entity definition as stages. Each stage SHALL carry the entity count, its ratio relative to the greatest common divisor of the stage counts, the stage's total per-tick output of the chain resource, the stage's total footprint cells, its total per-interval maintenance, and its capability demand. The chain SHALL carry the resource and the total per-tick output of the resource.

Source: PIC-10.5, GDD-10.6

#### Scenario: Chain stages carry counts and integer ratios
- **WHEN** a chain for `test.r.ore` has two extractors and two refiners
- **THEN** the stages report counts `2` and `2` with ratios `1` and `1`

#### Scenario: Stage demand aggregates capability and maintenance
- **WHEN** each of two refiners requires `1` of a capability and pays `100` maintenance per interval
- **THEN** the refiner stage's capability demand is `1` for the capability and its maintenance is `200` per interval

### Requirement: Planning codec
`decodePlanning(value)` SHALL accept the `PlanningDto` shape and return the typed value, rejecting a missing required scalar field with `protocol.invalid_field`.

Source: PIC-10.5, TDS-22

#### Scenario: A planning read model decodes
- **WHEN** a valid planning DTO is decoded
- **THEN** the result is ok and carries the decoded tiers

#### Scenario: A planning DTO without a scope is rejected
- **WHEN** a planning scope entry lacks `scope`
- **THEN** the result reports `protocol.invalid_field`

### Requirement: Inventory effective capacity in projections
An inventory DTO SHALL report the effective capacity of each resource: the inventory's declared per-resource or total capacity plus the bonuses of active storage providers that target the inventory. When neither a per-resource nor a total capacity is declared, the DTO SHALL omit the capacity.

Source: PIC-9.1, GDD-8.1, GDD-9.7

#### Scenario: The DTO includes a storage-provider bonus
- **WHEN** an inventory has base per-resource capacity `1000` and an active provider adds `500`
- **THEN** the inventory DTO reports capacity `1500` for that resource

#### Scenario: An unlimited inventory omits capacity
- **WHEN** an inventory declares no total and no per-resource capacity
- **THEN** its DTO entries omit `capacity`

### Requirement: Location throughput DTO
The location projection and the location summary read model SHALL include a `throughput` object with `capacity`, `requested`, and `throttle_permille` when the location has a throughput pool, and SHALL omit it otherwise.

Source: PIC-9.1, PIC-10.2, GDD-15.1

#### Scenario: A throughput-limited location exposes its pool
- **WHEN** a location has a pool with capacity `8000`, requested `1600`, and throttle `625`
- **THEN** its projection reports those three values

#### Scenario: An unbounded location omits throughput
- **WHEN** a location has no throughput pool
- **THEN** its projection omits `throughput`

### Requirement: Location connection ids in snapshots
A full snapshot SHALL include a location's outgoing connection ids as `connections`, ordered by ascending connection id. The field SHALL be omitted when the location has no connections.

Source: PIC-9.1, GDD-6.3

#### Scenario: A connected location exposes its connection ids
- **WHEN** location `A` has a connection with id `test.conn.a_b`
- **THEN** its snapshot entry has `connections: ["test.conn.a_b"]`

#### Scenario: An unconnected location omits the field
- **WHEN** a location has no outgoing connections
- **THEN** its snapshot entry has no `connections` field

### Requirement: Transport detail read model
`transportDetail(session, entity)` SHALL return a transport detail for an entity with cargo, movement, or an assignment, and `null` otherwise. The detail SHALL include the assigned order id and mode, the order's stations and actions with their resource ids and rule modes, the current station index, the current connection path, cargo by slot or entry, the current action progress, and any stored failure reason. The state SHALL be `unassigned`, `moving`, `handling`, or `waiting`.

Source: PIC-10.4, TDS-18.4

#### Scenario: An assigned unit exposes its order and progress
- **WHEN** a unit is assigned to a two-station route and is handling at station `1`
- **THEN** the detail has `order_id`, `mode: route`, `state: handling`, `current_station: 1`, and the progress `handled` and `target`

#### Scenario: Cargo is reported by slot
- **WHEN** a typed cargo has `40` of `test.resource.a` in slot `0` and an empty slot `1`
- **THEN** the detail lists both slots, with the resource id on the first and no resource id on the second

#### Scenario: A failure reason is reported
- **WHEN** the station cursor stores `cargo_cannot_unload`
- **THEN** the detail has `failure_reasons: ["cargo_cannot_unload"]`

#### Scenario: A non-transport entity has no detail
- **WHEN** the entity has no cargo, movement, or assignment
- **THEN** `transportDetail` returns `null`

### Requirement: Transport detail decoding
The protocol SHALL decode a transport detail DTO and reject a payload missing `entity_id` or `state` or carrying a malformed station, cargo, or progress field.

Source: PIC-10.4, TDS-22

#### Scenario: A well-formed detail decodes
- **WHEN** a detail carries an order, one station, cargo, progress, and a failure reason
- **THEN** decoding succeeds and preserves the fields

#### Scenario: A detail without state is rejected
- **WHEN** a detail omits `state`
- **THEN** decoding fails

### Requirement: Snapshot connection details
A location snapshot SHALL include `connection_details` for its outgoing connection instances, each with `connection_id`, `origin_id`, `destination_id`, `base_duration_ticks`, and `enabled`, ordered by ascending connection id.

Source: PIC-9.1, GDD-6.3

#### Scenario: A connected location exposes connection details
- **WHEN** a location has a bidirectional connection to another location
- **THEN** its snapshot entry has one connection detail with both endpoints and the duration

### Requirement: Snapshot transport summary
An entity snapshot SHALL include a `transport` summary with `state` (`unassigned`, `moving`, `handling`, or `waiting`) and the assigned `order_id` when the entity has movement or an assignment. A transport entity's `location_id` SHALL be its current movement location.

Source: PIC-9.1, PIC-10.4

#### Scenario: A moving transport reports its state and location
- **WHEN** a transport entity is moving from location `1` to location `3`
- **THEN** its snapshot has `transport.state: moving`, `transport.order_id`, and `location_id: 1`

#### Scenario: A non-transport entity omits the summary
- **WHEN** an entity has no movement and no assignment
- **THEN** its snapshot has no `transport` field

### Requirement: Transport-order list read model
`transportOrders(session)` SHALL list every order entity in ascending entity id with its `order_id`, `mode`, `repeat`, and stations/actions (resource id, action, rule mode, optional quantity).

Source: PIC-10.4, REF-12.4

#### Scenario: An order appears in the list
- **WHEN** one route order exists with two stations
- **THEN** the list has one entry with mode `route`, `repeat`, and two stations

#### Scenario: The list is ordered by entity id
- **WHEN** orders `9` and `6` exist
- **THEN** the list is `[6, 9]`

### Requirement: Transition eligibility read model
The entity detail read model SHALL report, for every transition whose source tier matches the residence, an eligibility entry with the transition ID, an `eligible` flag, the band's `advancement_enabled` flag, and a condition checklist. Each `sustained` node SHALL report its required ticks, current progress, and whether it is met; the transition's overall condition SHALL be reported as one further entry.

Source: PIC-10.1, GDD-13.1, TDS-14.3

#### Scenario: Sustained progress below the threshold is ineligible
- **WHEN** a residence's transition condition requires `3` sustained ticks and its timer stores `2`
- **THEN** the eligibility entry is not eligible and its sustained condition reports `ticks: 3`, `progress: 2`, `met: false`

#### Scenario: Sustained progress at the threshold is eligible
- **WHEN** the timer stores `3` consecutive ticks
- **THEN** the eligibility entry is eligible and the sustained condition is met

### Requirement: Advancement enablement gate
A transition that is not one of the tier's `decline_transitions` SHALL be ineligible while the residence's band reports `advancement_enabled: false`; a decline transition SHALL remain eligible.

Source: PIC-10.1, GDD-12.6

#### Scenario: A disabled advancement gate blocks advancement only
- **WHEN** the band has `advancement_enabled: false` and the residence has one advancement and one decline transition
- **THEN** the advancement entry is ineligible and the decline entry stays eligible

### Requirement: Fog-filtered read models
The read models SHALL filter per actor when fog is enabled: entity detail, need breakdown, and transition eligibility SHALL return no result for an entity at a location unknown to the actor; the location summary of an unknown location SHALL carry only its entity ID and `knowledge: unknown`; planning metrics SHALL exclude producers at locations unknown to the actor. The transport detail and order-list read models expose only entity and station IDs and SHALL remain unfiltered.

Source: ARCH-8.3, PIC-9.3, PIC-10.1, PIC-10.2, PIC-10.5

#### Scenario: An entity at an unknown location has no detail
- **WHEN** entity detail is requested for an entity at a location unknown to the requesting actor
- **THEN** the read model returns no result

#### Scenario: An unknown location summary is minimal
- **WHEN** the location summary is requested for a location unknown to the requesting actor
- **THEN** it carries only the entity ID and `knowledge: unknown`

#### Scenario: Planning ignores unknown producers
- **WHEN** planning metrics are computed for an actor and a producer sits at a location unknown to that actor
- **THEN** the producer contributes no row

### Requirement: INV-19 fog safety
The invariant that no projection, delta, read model, or event for an actor contains attributes of a location unknown to that actor SHALL be covered by unit tests per read model and event type, and by the P-09 property on generated multi-location worlds with mixed knowledge states.

Source: INV-19, ARCH-8.3, P-09, VER-9.4

#### Scenario: P-09 holds on generated worlds
- **WHEN** projections, deltas, read models, and filtered event streams are built for actors on generated multi-location worlds with mixed knowledge states
- **THEN** no unknown location's attributes appear in any of them

### Requirement: Owner visibility
When fog is enabled, every projection is filtered by the requesting actor's knowledge state, and the filtering happens while building in the application layer; the simulation always holds full state. An event is visible to an actor when it names that actor as its owner, or when it carries no owner and its location, if any, is known to that actor.

Source: ARCH-8.3, PIC-9.3, TDS-17

#### Scenario: A foreign arrival is invisible
- **WHEN** another owner's transport unit arrives at a location and the event stream is filtered for an actor that does not own the unit and has not discovered the location
- **THEN** the event is not visible to that actor

#### Scenario: A discovery event is visible to its owner
- **WHEN** a `LocationDiscovered` event names an actor as its owner
- **THEN** the event is visible to that actor

### Requirement: Exchange quotes read model
The `exchangeQuotes(session, actor, exchange)` read model SHALL return, for an exchange entity, the exchange's entity id, location id, region (of its location), currency, the quote validity revision, and one quote per good carrying the current buy and sell price, both base prices, the in-window sold and bought volume, and an informative recovery estimate in ticks toward each base price. The read model SHALL be a pure projection of authoritative state and SHALL be null for an entity that is not an exchange. Quotes are informative; trades always execute at the authoritative price of the executing tick.

Source: PIC-10.7, ARCH-14.5

#### Scenario: Quotes report prices, bases, and volume
- **WHEN** quotes are requested for an exchange whose good trades `300` within the window at a sell price of `720` against a base of `800`
- **THEN** the good's quote carries the current sell and buy price, both base prices, the in-window volume, and the recovery estimate toward the base

#### Scenario: A non-exchange entity has no quotes
- **WHEN** quotes are requested for an entity without an `exchangeRef`
- **THEN** the read model returns no result

#### Scenario: The recovery estimate counts intervals to base
- **WHEN** a good's sell price is `720` against a base of `800` with recovery `200` permille per `5` ticks
- **THEN** the recovery estimate is `5` ticks

### Requirement: Fog-filtered quotes
When fog is enabled and the requesting actor does not know the exchange's location, the read model SHALL return no result, like other location-bound read models.

Source: PIC-10.7, PIC-9.3, ARCH-8.3

#### Scenario: Quotes of an unknown location are withheld
- **WHEN** an actor without knowledge of the exchange's location requests quotes with fog enabled
- **THEN** the read model returns no result

### Requirement: Host query routing
The web-worker host SHALL route an additive `exchange_quotes` query kind with an entity id to the read model for the session actor.

Source: PIC-10.7, TDS-21.1

#### Scenario: The host answers an exchange-quotes query
- **WHEN** the client sends an `exchange_quotes` query for an exchange entity
- **THEN** the host answers with the exchange-quotes DTO
