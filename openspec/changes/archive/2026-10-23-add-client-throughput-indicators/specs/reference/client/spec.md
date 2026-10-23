# Spec Delta

## ADDED Requirements

### Requirement: Throughput gauge and overlay
The location grid SHALL show a throughput gauge when the location snapshot carries a throughput DTO, and SHALL provide a `T` overlay that highlights entities whose production block reasons include `throughput_throttled`. The gauge SHALL report capacity, requested quantity, and throttle permille.

Source: REF-12.2, REF-13.2, PIC-9.1

#### Scenario: A throttled location shows a gauge
- **WHEN** a location snapshot has capacity `1000`, requested `1600`, and throttle `625` permille
- **THEN** the grid shows a gauge with capacity `1000`, requested `1600`, and throttle `625`

#### Scenario: The throughput overlay highlights a throttled entity
- **WHEN** the `T` overlay is active and an entity's block reasons include `throughput_throttled`
- **THEN** the grid marks that entity as throttled

#### Scenario: A location without throughput shows no gauge
- **WHEN** a location snapshot has no throughput DTO
- **THEN** the grid shows no throughput gauge

### Requirement: Throughput pressure calculation
The gauge SHALL derive pressure as `floor(1000 × requested / capacity)` permille, `0` when both are zero, and `1000` when capacity is zero and requested is positive. It SHALL mark the gauge throttled when `throttle_permille < 1000`.

Source: REF-12.2, PIC-9.1

#### Scenario: Pressure reports over-request
- **WHEN** capacity is `1000` and requested is `1600`
- **THEN** pressure is `1600` permille and the gauge is throttled

#### Scenario: Zero capacity with demand is full pressure
- **WHEN** capacity is `0` and requested is `100`
- **THEN** pressure is `1000` permille
