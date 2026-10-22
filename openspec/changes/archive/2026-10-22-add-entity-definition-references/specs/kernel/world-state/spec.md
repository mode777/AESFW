# Spec Delta

## Purpose

Entity identity: the `definition` component is populated at instantiation and exposed through projections and read models (TDS-8.3, PIC-9.1, PIC-10.1).

## ADDED Requirements

### Requirement: Entity definition component
Content-to-world instantiation SHALL set each content entity's `definition` component to its definition handle, so that `readWorld(world, registry).definition(entity)` returns the entity's definition handle for every instantiated entity.

Source: TDS-8.3, TDS-8.5

#### Scenario: An instantiated entity has its definition
- **WHEN** content with entity definition `test.entity.producer` (handle `H`) is instantiated
- **THEN** the created entity's `definition` component is `{ definition: H }`

### Requirement: Projections expose entity definition IDs
`project(session, actor)` SHALL set each entity's `definition_id` to the string ID of its `definition` component, and SHALL omit it only when the entity has no `definition` component.

Source: PIC-9.1, TDS-18.4

#### Scenario: A projected entity carries its definition ID
- **WHEN** an instantiated producer entity is projected
- **THEN** its `definition_id` is the producer's definition string ID, not `entity.<id>`

### Requirement: Entity detail exposes the definition ID
`entityDetail(session, entity)` SHALL set `definition_id` from the entity's `definition` component when present.

Source: PIC-10.1, TDS-18.4

#### Scenario: A residence detail carries its definition ID
- **WHEN** an instantiated residence is inspected
- **THEN** its `definition_id` is the residence's definition string ID

### Requirement: Disabling a producer lowers satisfaction
When a producer's `SetEntityEnabled` command sets it disabled, phase 07 SHALL block it with `entity_disabled`, its outputs SHALL stop, and the residence depending on them SHALL report lower need fulfillment and satisfaction in the following ticks.

Source: GDD-10.3, GDD-12.4, ARCH-5.2

#### Scenario: Fulfillment falls after disabling the producer
- **WHEN** a running loop is advanced to a steady state, the producer is disabled, and the loop is advanced further
- **THEN** the producer's block reasons contain `entity_disabled` and the residence's need fulfillment is lower than at steady state
