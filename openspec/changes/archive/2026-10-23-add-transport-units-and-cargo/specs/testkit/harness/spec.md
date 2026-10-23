# Spec Delta

## ADDED Requirements

### Requirement: Cargo-slot invariant
`checkInvariants` SHALL evaluate INV-16 for every `cargo` component: a `typed_slots` cargo has at most one resource type per slot, no slot exceeds `slot_capacity`, and an empty slot has quantity zero.

Source: INV-16, GDD-15.4

#### Scenario: A valid typed cargo has no finding
- **WHEN** every typed slot is empty or holds one resource within capacity
- **THEN** `checkInvariants` reports no INV-16 finding

#### Scenario: An over-capacity slot is reported
- **WHEN** a typed slot holds more than its slot capacity
- **THEN** `checkInvariants` reports INV-16
