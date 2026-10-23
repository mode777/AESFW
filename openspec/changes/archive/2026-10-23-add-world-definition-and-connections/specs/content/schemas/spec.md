# Spec Delta

## ADDED Requirements

### Requirement: Connection definition schema
The connection-definition schema SHALL accept `id`, optional `tags`, `direction` of `bidirectional` or `one_way`, required `traversal` with `base_duration_ticks` ≥ 1 and optional `costs` of `{ resource, quantity }`, and optional `allowed_transport_tags`. It SHALL reject unknown fields.

Source: CONT-6.5, GDD-6.3

#### Scenario: A bidirectional connection definition validates
- **WHEN** a connection definition declares `direction: bidirectional`, `base_duration_ticks: 100`, and one allowed transport tag
- **THEN** it validates with no diagnostics

#### Scenario: A connection definition with no traversal duration is rejected
- **WHEN** a connection definition omits `traversal.base_duration_ticks`
- **THEN** validation reports `schema_invalid`

### Requirement: World definition schema
The world-definition schema SHALL accept `id`, a non-empty `locations` array of `{ id, template, region?, properties? }`, optional `connections` of `{ id, definition, origin, destination, base_duration_ticks?, enabled? }`, and optional `owners` of `{ id, initial_resources?, established_locations?, known_locations?, initial_entities? }`. It SHALL reject unknown fields.

Source: CONT-6.6

#### Scenario: A world definition validates
- **WHEN** a world declares two locations, one connection, and one owner with initial resources
- **THEN** it validates with no diagnostics

#### Scenario: A world definition with no locations is rejected
- **WHEN** a world definition declares `locations: []`
- **THEN** validation reports `schema_invalid`

### Requirement: World reference validation
Reference validation SHALL report `unresolved_reference` when a world location names an unknown template, when a world connection names an unknown connection definition, or when a connection endpoint or owner location names a location absent from that world. It SHALL report `duplicate_world_location` for repeated location ids in one world and `duplicate_world_connection` for repeated connection ids in one world.

Source: CONT-6.6, CONT-11.3

#### Scenario: An unknown location template is reported
- **WHEN** a world location names template `test.location.missing`
- **THEN** reference validation reports `unresolved_reference` at that location's template path

#### Scenario: An unknown connection endpoint is reported
- **WHEN** a world connection names destination `test.loc.missing`
- **THEN** reference validation reports `unresolved_reference` at that connection's destination path

#### Scenario: Duplicate world location ids are reported
- **WHEN** one world lists location id `test.loc.a` twice
- **THEN** reference validation reports `duplicate_world_location`
