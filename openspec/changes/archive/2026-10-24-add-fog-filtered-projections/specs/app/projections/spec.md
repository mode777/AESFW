# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements


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
