# Spec Delta

## Purpose

The presentation contract of 04 as versioned TypeScript wire DTOs and pure boundary codecs, with no runtime dependency on any other framework package (TDS-22, PIC-3).

## ADDED Requirements

### Requirement: Protocol version and wire conventions
`@aesfw/protocol` SHALL export `PROTOCOL_VERSION` as the integer `1`. Every worker message DTO SHALL carry `protocol_version` and a `kind` discriminator. Wire field names SHALL be `snake_case` exactly as written in 04, and every quantity on the wire SHALL be a base-unit integer or a string, boolean, `null`, array, or object.

Source: TDS-22, PIC-3

#### Scenario: The protocol version is 1
- **WHEN** `PROTOCOL_VERSION` is read
- **THEN** it is the integer `1`

#### Scenario: Worker messages carry the version and kind
- **WHEN** a worker request DTO `{ kind: 'command', protocol_version: 1, ... }` is decoded
- **THEN** decoding succeeds and the decoded value's `kind` is `command`

### Requirement: Command envelope codec
`decodeCommandEnvelope(value)` SHALL accept an object with a string `command_id`, a string `actor_id`, an optional integer `expected_session_revision`, a string `type`, and an object `payload`, and SHALL return the typed `CommandEnvelopeDto`. It SHALL reject a non-object, a missing or non-string `command_id` or `actor_id`, a non-integer `expected_session_revision`, or a missing `payload` with a `ProtocolError` whose code is `protocol.invalid_field`.

Source: PIC-12, TDS-22

#### Scenario: A valid command envelope decodes
- **WHEN** `decodeCommandEnvelope({ command_id: 'c1', actor_id: 'test.owner.1', type: 'SetEntityEnabled', payload: { entity_id: 100, enabled: true } })` is called
- **THEN** the result is ok and the value carries `command_id` `c1` and `type` `SetEntityEnabled`

#### Scenario: A command envelope without an actor is rejected
- **WHEN** `decodeCommandEnvelope({ command_id: 'c1', type: 'SetEntityEnabled', payload: {} })` is called
- **THEN** the result is an error whose first `ProtocolError.code` is `protocol.invalid_field` and whose `path` is `actor_id`

#### Scenario: A command envelope with a negative revision is rejected
- **WHEN** `decodeCommandEnvelope({ command_id: 'c1', actor_id: 'test.owner.1', expected_session_revision: -1, type: 'SetEntityEnabled', payload: {} })` is called
- **THEN** the result is an error whose first `ProtocolError.code` is `protocol.invalid_field`

### Requirement: Command result codec
`decodeCommandResult(value)` SHALL accept an accepted result with a string `command_id`, `status` `'accepted'`, and an integer `scheduled_tick`, or a rejected result with a string `command_id`, `status` `'rejected'`, an integer `current_revision`, and a non-empty array of `{ code: string, arguments: object }` errors. It SHALL reject any other shape with `protocol.invalid_field`.

Source: PIC-13, TDS-22

#### Scenario: An accepted result decodes
- **WHEN** `decodeCommandResult({ command_id: 'c1', status: 'accepted', scheduled_tick: 5 })` is called
- **THEN** the result is ok and the value's `status` is `accepted`

#### Scenario: A rejected result without errors is rejected
- **WHEN** `decodeCommandResult({ command_id: 'c1', status: 'rejected', current_revision: 4, errors: [] })` is called
- **THEN** the result is an error whose first code is `protocol.invalid_field`

### Requirement: Snapshot codec
`decodeSnapshot(value)` SHALL accept a full snapshot with integer `tick` and `revision`, string `session_id` and `configuration_checksum`, and arrays `owners`, `locations`, and `entities`; each owner SHALL carry a string `owner_id` and an object `resources`. It SHALL reject a missing required field with `protocol.invalid_field`.

Source: PIC-9, TDS-22

#### Scenario: A minimal snapshot decodes
- **WHEN** `decodeSnapshot({ session_id: 's1', tick: 0, revision: 0, configuration_checksum: 'abc', owners: [{ owner_id: 'test.owner.1', resources: {} }], locations: [], entities: [] })` is called
- **THEN** the result is ok and the value has one owner

#### Scenario: A snapshot without a tick is rejected
- **WHEN** `decodeSnapshot({ session_id: 's1', revision: 0, configuration_checksum: 'abc', owners: [], locations: [], entities: [] })` is called
- **THEN** the result is an error whose first `ProtocolError.path` is `tick`

### Requirement: Snapshot delta codec
`decodeSnapshotDelta(value)` SHALL accept a delta with string `session_id`, integer `from_revision`, `to_revision`, and `tick`, and arrays `entity_updates` and `inventory_updates`. It SHALL reject a missing required field with `protocol.invalid_field`.

Source: PIC-9, TDS-22

#### Scenario: A delta decodes
- **WHEN** `decodeSnapshotDelta({ session_id: 's1', from_revision: 1, to_revision: 2, tick: 3, entity_updates: [], inventory_updates: [] })` is called
- **THEN** the result is ok and the value's `to_revision` is `2`

### Requirement: Domain event codec
`decodeEvent(value)` SHALL accept an object with string `session_id`, integer `tick` and `sequence`, string `type`, an array of integer `subjects`, and an object `payload`, and SHALL reject any other shape with `protocol.invalid_field`. Unknown event `type` values SHALL still decode, so clients can ignore events they do not know.

Source: PIC-11, TDS-22

#### Scenario: A known event decodes
- **WHEN** `decodeEvent({ session_id: 's1', tick: 10, sequence: 1, type: 'ProductionCompleted', subjects: [8241], payload: {} })` is called
- **THEN** the result is ok and the value's `subjects` is `[8241]`

#### Scenario: An unknown event type still decodes
- **WHEN** `decodeEvent({ session_id: 's1', tick: 10, sequence: 1, type: 'FutureEvent', subjects: [], payload: {} })` is called
- **THEN** the result is ok and the value's `type` is `FutureEvent`

#### Scenario: An event without a sequence is rejected
- **WHEN** `decodeEvent({ session_id: 's1', tick: 10, type: 'ProductionCompleted', subjects: [], payload: {} })` is called
- **THEN** the result is an error whose first `ProtocolError.path` is `sequence`

### Requirement: Definition metadata and read-model codecs
`decodeDefinitionMetadata(value)`, `decodeEntityDetail(value)`, `decodeLocationSummary(value)`, and `decodeNeedBreakdown(value)` SHALL each accept the DTO shape of PIC-4 and PIC-10.1–10.3 and return the typed value, rejecting a missing required scalar field with `protocol.invalid_field`. Definition metadata SHALL carry a string `definition_id`, a string `definition_type`, a string array `tags`, and an object `parameters`.

Source: PIC-4, PIC-10.1, PIC-10.2, PIC-10.3, TDS-22

#### Scenario: Definition metadata decodes
- **WHEN** `decodeDefinitionMetadata({ definition_id: 'test.entity.producer', definition_type: 'entity', tags: ['test.tag.a'], parameters: { rate: 10 } })` is called
- **THEN** the result is ok and the value's `definition_id` is `test.entity.producer`

#### Scenario: Entity detail without an entity id is rejected
- **WHEN** `decodeEntityDetail({ definition_id: 'test.entity.producer' })` is called
- **THEN** the result is an error whose first `ProtocolError.path` is `entity_id`

#### Scenario: A need breakdown decodes
- **WHEN** `decodeNeedBreakdown({ entity_id: 7, need_id: 'test.need.a', demand: 1000, delivered: 800, fulfillment: 800, category: 'test.need_category.a', category_result: 800 })` is called
- **THEN** the result is ok and the value's `fulfillment` is `800`

### Requirement: Codec error catalogue
Every decode function SHALL return `{ ok: true, value }` or `{ ok: false, error: readonly ProtocolError[] }`, where `ProtocolError` has a stable `code`, a `path` (JSON-pointer-like string), and string-or-number-or-boolean `arguments`. The only codes emitted in v1 SHALL be `protocol.invalid_field` (a wrong or missing field), `protocol.unknown_kind` (an unrecognized message `kind`), and `protocol.version_mismatch` (a `protocol_version` other than `1`).

Source: TDS-22, PIC-13

#### Scenario: A non-object input is rejected
- **WHEN** `decodeCommandEnvelope(null)` is called
- **THEN** the result is an error whose first code is `protocol.invalid_field`

#### Scenario: An unknown worker message kind is rejected
- **WHEN** `decodeWorkerRequest({ kind: 'nope', protocol_version: 1 })` is called
- **THEN** the result is an error whose first code is `protocol.unknown_kind`

### Requirement: Worker request codec
`decodeWorkerRequest(value)` SHALL accept a message with an integer `protocol_version` equal to `1` and a string `kind` that is one of `init`, `subscribe`, `command`, `control`, `query`, `save`, or `load`. A missing or non-integer `protocol_version` SHALL be rejected with `protocol.invalid_field`; another integer `protocol_version` SHALL be rejected with `protocol.version_mismatch`; an unrecognized `kind` SHALL be rejected with `protocol.unknown_kind`.

Source: TDS-21.1, TDS-22

#### Scenario: A command request decodes
- **WHEN** `decodeWorkerRequest({ kind: 'command', protocol_version: 1, command: { command_id: 'c1', actor_id: 'test.owner.1', type: 'SetEntityEnabled', payload: {} } })` is called
- **THEN** the result is ok and the value's `kind` is `command`

#### Scenario: A mismatched protocol version is rejected
- **WHEN** `decodeWorkerRequest({ kind: 'control', protocol_version: 2, action: 'pause' })` is called
- **THEN** the result is an error whose first code is `protocol.version_mismatch`

#### Scenario: A non-integer protocol version is rejected
- **WHEN** `decodeWorkerRequest({ kind: 'control', protocol_version: '1', action: 'pause' })` is called
- **THEN** the result is an error whose first code is `protocol.invalid_field`

### Requirement: Worker response codec
`decodeWorkerResponse(value)` SHALL accept a message with an integer `protocol_version` equal to `1` and a string `kind` that is one of `ready`, `snapshot`, `delta`, `command_result`, `query_result`, `saved`, `loaded`, or `error`, applying the same version rules as `decodeWorkerRequest`.

Source: TDS-21.1, TDS-22

#### Scenario: A snapshot response decodes
- **WHEN** `decodeWorkerResponse({ kind: 'snapshot', protocol_version: 1, snapshot: { session_id: 's1', tick: 0, revision: 0, configuration_checksum: 'abc', owners: [], locations: [], entities: [] } })` is called
- **THEN** the result is ok and the value's `kind` is `snapshot`

#### Scenario: An unknown response kind is rejected
- **WHEN** `decodeWorkerResponse({ kind: 'nope', protocol_version: 1 })` is called
- **THEN** the result is an error whose first code is `protocol.unknown_kind`
