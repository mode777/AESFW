# Spec Delta

## ADDED Requirements

### Requirement: INV-14 knowledge monotonicity
The invariant harness SHALL check after every tick that, per owner and location, the knowledge level never decreases (`unknown < discovered < established`), and that each owner's knowledge entries stay sorted by ascending location ID without duplicates.

Source: INV-14, GDD-16.1

#### Scenario: A downgrade is reported
- **WHEN** a system lowers an owner's knowledge from `established` to `discovered` across a tick
- **THEN** `checkInvariants` reports an INV-14 finding naming the owner and location
