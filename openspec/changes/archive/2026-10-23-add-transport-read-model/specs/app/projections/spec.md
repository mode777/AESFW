# Spec Delta

## ADDED Requirements

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
