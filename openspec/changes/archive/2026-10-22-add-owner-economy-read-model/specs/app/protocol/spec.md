# Spec Delta

## Purpose

Additive wire fields for the owner economy read model (PIC-10.6) and the delta `owner_updates` list (PIC-9.2).

## ADDED Requirements

### Requirement: Owner economy wire fields
`OwnerBalanceDto` SHALL optionally carry `revenue_by_source` and `expenses_by_source` (string-keyed integer records) and `idle_paying_entities` (an integer array). `SnapshotDeltaDto` SHALL optionally carry `owner_updates`, an array of full owner entries. The snapshot delta codec SHALL decode `owner_updates` with the same shape as the snapshot's `owners` array, and SHALL accept deltas without the field.

Source: PIC-10.6, PIC-9.2, PIC-3

#### Scenario: A delta with owner updates decodes
- **WHEN** `decodeSnapshotDelta` receives a delta whose `owner_updates` carries one owner entry with a balance
- **THEN** the result is ok and the decoded update carries the balance

#### Scenario: A delta without owner updates decodes
- **WHEN** `decodeSnapshotDelta` receives a delta without `owner_updates`
- **THEN** the result is ok and `owner_updates` is absent

#### Scenario: A malformed owner update is rejected
- **WHEN** `decodeSnapshotDelta` receives an `owner_updates` entry without `owner_id`
- **THEN** the result reports `protocol.invalid_field`
