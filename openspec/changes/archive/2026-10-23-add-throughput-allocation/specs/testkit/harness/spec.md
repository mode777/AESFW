# Spec Delta

## ADDED Requirements

### Requirement: Throughput allocation invariant
`checkInvariants` SHALL evaluate INV-06 for every throughput-limited location: the sum of its grants SHALL NOT exceed the location's capacity, each grant SHALL NOT exceed its request, and each grant SHALL differ from its exact proportional share by less than one unit. A missing pool or allocation SHALL produce no finding.

Source: INV-06, VER-6, GDD-15.1, TDS-6.3

#### Scenario: INV-06 reports an over-capacity grant
- **WHEN** a throughput-limited location has capacity `1000` and its allocations sum to `1001`
- **THEN** `checkInvariants` returns an INV-06 finding

#### Scenario: INV-06 accepts an exact allocation
- **WHEN** a throughput-limited location has capacity `1000` and grants `600` and `400` for requests `600` and `400`
- **THEN** `checkInvariants` returns no INV-06 finding
