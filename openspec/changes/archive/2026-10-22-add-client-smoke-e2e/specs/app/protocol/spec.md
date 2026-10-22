# Spec Delta

## Purpose

The `delta` worker response carries the last state hash so the client can display and check it (TDS-21.1, TDS-19.4).

## ADDED Requirements

### Requirement: Delta hash
`WorkerDeltaResponseDto` SHALL carry an optional `hash` string, the `fnv1a64-canonical-json-v1` state hash after the coalesced ticks. A delta without `hash` SHALL still decode.

Source: TDS-21.1, TDS-19.4

#### Scenario: A delta with a hash decodes
- **WHEN** `decodeWorkerResponse({ kind: 'delta', protocol_version: 1, delta: { session_id: 's1', from_revision: 0, to_revision: 1, tick: 1, entity_updates: [], inventory_updates: [] }, events: [], hash: '0123456789abcdef' })` is called
- **THEN** the result is ok and the value's `hash` is `0123456789abcdef`

#### Scenario: A delta without a hash decodes
- **WHEN** `decodeWorkerResponse({ kind: 'delta', protocol_version: 1, delta: { session_id: 's1', from_revision: 0, to_revision: 1, tick: 1, entity_updates: [], inventory_updates: [] }, events: [] })` is called
- **THEN** the result is ok and the value has no `hash`
