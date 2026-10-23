# Spec Delta

## ADDED Requirements

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
