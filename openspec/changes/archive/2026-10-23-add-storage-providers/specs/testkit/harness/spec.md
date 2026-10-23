# Spec Delta

## ADDED Requirements

### Requirement: INV-03 uses effective capacity
`checkInvariants` SHALL evaluate INV-03 against the effective capacity of each inventory: its declared total and per-resource capacities plus the bonuses of active storage providers. An unlimited declared capacity SHALL remain unlimited.

Source: INV-03, VER-6, GDD-9.7

#### Scenario: Stored quantity within the storage bonus passes
- **WHEN** an inventory has base total capacity `1000`, an active provider adds `500`, and it stores `1500`
- **THEN** `checkInvariants` returns no INV-03 finding

#### Scenario: Stored quantity above the effective capacity is reported
- **WHEN** an inventory has base total capacity `1000`, an active provider adds `500`, and it stores `1501`
- **THEN** `checkInvariants` returns an INV-03 finding
