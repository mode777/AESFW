# Spec Delta

## ADDED Requirements

### Requirement: Location establishment collection
The schema catalogue SHALL accept the `location_establishments` collection with `requires_knowledge` limited to `discovered` and `established`, `cost_source` to `transport_cargo`, `activation` to `on_completion`, and `ownership` to `exclusive`, and SHALL reject unknown fields. The location-template schema SHALL accept an optional `establishment` field naming an establishment definition.

Source: CONT-6.20, CONT-6.4

#### Scenario: An establishment definition validates
- **WHEN** an establishment declares every v1 field with valid literals
- **THEN** it validates with no diagnostics

#### Scenario: An unknown cost source is rejected
- **WHEN** an establishment declares `cost_source: remote_inventory`
- **THEN** validation reports `schema_invalid`

#### Scenario: A template establishment reference resolves
- **WHEN** a location template declares `establishment: test.establishment.default` and the definition exists
- **THEN** it validates with no diagnostics, and an unknown name reports `unresolved_reference`
