# Spec Delta

## ADDED Requirements

### Requirement: Location connection ids in snapshots
A full snapshot SHALL include a location's outgoing connection ids as `connections`, ordered by ascending connection id. The field SHALL be omitted when the location has no connections.

Source: PIC-9.1, GDD-6.3

#### Scenario: A connected location exposes its connection ids
- **WHEN** location `A` has a connection with id `test.conn.a_b`
- **THEN** its snapshot entry has `connections: ["test.conn.a_b"]`

#### Scenario: An unconnected location omits the field
- **WHEN** a location has no outgoing connections
- **THEN** its snapshot entry has no `connections` field
