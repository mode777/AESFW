# Spec Delta

## ADDED Requirements

### Requirement: Location throughput DTO
The location projection and the location summary read model SHALL include a `throughput` object with `capacity`, `requested`, and `throttle_permille` when the location has a throughput pool, and SHALL omit it otherwise.

Source: PIC-9.1, PIC-10.2, GDD-15.1

#### Scenario: A throughput-limited location exposes its pool
- **WHEN** a location has a pool with capacity `8000`, requested `1600`, and throttle `625`
- **THEN** its projection reports those three values

#### Scenario: An unbounded location omits throughput
- **WHEN** a location has no throughput pool
- **THEN** its projection omits `throughput`
