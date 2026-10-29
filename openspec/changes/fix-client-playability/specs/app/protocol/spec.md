## ADDED Requirements

### Requirement: Entity creation and removal wire fields
`SnapshotDeltaDto` SHALL optionally carry `entity_creates`, an array of entity entries with the same shape as the snapshot's `entities`, and `entity_removals`, an array of integer entity IDs. `decodeSnapshotDelta` SHALL decode both, SHALL accept deltas without them, and SHALL reject a non-array value or a malformed element with `protocol.invalid_field`. `PROTOCOL_VERSION` SHALL remain `1`.

Source: PIC-9.2, PIC-3, TDS-22, amendment A17

#### Scenario: A delta with creations and removals decodes
- **WHEN** `decodeSnapshotDelta({ session_id: 's1', from_revision: 1, to_revision: 2, tick: 3, entity_updates: [], inventory_updates: [], entity_creates: [{ entity_id: 24, definition_id: 'test.entity.a', location_id: 1, revision: 1 }], entity_removals: [9] })` is called
- **THEN** the result is ok, the value's `entity_creates[0].entity_id` is `24`, and its `entity_removals` is `[9]`

#### Scenario: A delta without the new fields still decodes
- **WHEN** `decodeSnapshotDelta({ session_id: 's1', from_revision: 1, to_revision: 2, tick: 3, entity_updates: [], inventory_updates: [] })` is called
- **THEN** the result is ok and the value has neither an `entity_creates` nor an `entity_removals` key

#### Scenario: A non-integer removal is rejected
- **WHEN** `decodeSnapshotDelta` is called with `entity_removals: ['9']` and otherwise valid fields
- **THEN** the result is an error whose code is `protocol.invalid_field`

#### Scenario: A malformed created entity is rejected
- **WHEN** `decodeSnapshotDelta` is called with `entity_creates: [{ definition_id: 'test.entity.a' }]` (no `entity_id`) and otherwise valid fields
- **THEN** the result is an error whose code is `protocol.invalid_field`

#### Scenario: The protocol version is unchanged
- **WHEN** `PROTOCOL_VERSION` is read
- **THEN** it is `1`
