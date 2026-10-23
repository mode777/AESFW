# sim/internal-logistics Specification

## Purpose
Internal-logistics throughput bounds how much resource quantity can move between entities and a location inventory each tick, allocated proportionally and deterministically across requesters.

## Requirements

### Requirement: Throughput pool capacity
A throughput-limited location SHALL have a per-tick throughput capacity equal to its configured `internal_logistics.base_throughput` plus the location-scoped supply of `internal_logistics.base_throughput_capability` when that capability is configured. A location without `internal_logistics` SHALL be unbounded and SHALL not report throughput state.

Source: GDD-6.6, GDD-15.1, CONT-6.4

#### Scenario: Capacity combines the configured base and capability supply
- **WHEN** a location configures `base_throughput: 6000` and its `base_throughput_capability` has `2000` location-scoped supply
- **THEN** the location's throughput capacity is `8000` for the tick

#### Scenario: A location without internal logistics is unbounded
- **WHEN** a location has no `internal_logistics` configuration
- **THEN** its requesters are not throttled and it has no throughput pool

### Requirement: Throughput request sources
Phase 09 SHALL collect one request per requester at a throughput-limited location, in ascending entity ID. A resource source's request SHALL be its planned output quantity for the tick. A producer's request SHALL be the sum of its planned input and output movement. A residence's request SHALL be the sum of its `resource_consumption` need demands.

Source: GDD-15.1, ARCH-5.2, TDS-11.3

#### Scenario: Source, producer, and need requests are collected
- **WHEN** a source plans `1000` output, a completing producer plans `600` input and `400` output, and a residence demands `300`
- **THEN** phase 09 collects requests `1000`, `1000`, and `300` in ascending entity ID

### Requirement: Throughput request timing and exclusions
Phase 09 SHALL count a producer's movement only when its process completes this tick or when its effective duration is one tick. It SHALL exclude entities that are disabled, paused by deficit, blocked, or at an inactive location.

Source: GDD-15.1, ARCH-5.2, TDS-11.3

#### Scenario: A blocked producer requests nothing
- **WHEN** a producer carries `missing_input`
- **THEN** phase 09 collects no throughput request for that producer

#### Scenario: A processing batch producer requests only on its completion tick
- **WHEN** a batch producer with a `10`-tick recipe has progress `4` and planned movement `1000`
- **THEN** phase 09 collects no request for it this tick

### Requirement: Proportional throughput allocation
Phase 10 SHALL allocate each throughput-limited location's capacity across its requests with `alloc-v1` (TDS-6.3), ordering requesters by ascending entity ID. When total requests do not exceed capacity, every request SHALL be granted in full.

Source: GDD-15.1, TDS-6.3, INV-06

#### Scenario: Requests within capacity are granted in full
- **WHEN** capacity is `6000` and requests are `2000` and `3000`
- **THEN** both requesters receive their full request and throttle `1000`

### Requirement: Throughput allocation remainder and throttle
When total requests exceed capacity, each grant SHALL be `floor(capacity × request / totalRequests)` and the remainder SHALL go to the largest exact remainders with ties broken by ascending entity ID. The throttle factor SHALL be `1000` for a zero request and `floor(1000 × grant / request)` otherwise.

Source: GDD-15.1, TDS-6.3

#### Scenario: Over-capacity requests are throttled proportionally
- **WHEN** capacity is `1000` and two requesters request `1000` each
- **THEN** each is granted `500` and throttled to `500` permille

#### Scenario: Remainder ties break by ascending entity ID
- **WHEN** capacity is `2` and three requesters each request `1`
- **THEN** the two lowest entity IDs are granted `1` and the highest is granted `0`

### Requirement: Throttled movement
Phases 11–20 SHALL execute within the granted throughput. A throttled requester SHALL move `floor(planned × throttle_permille / 1000)` and SHALL report `throughput_throttled` when `throttle_permille < 1000`. A source's deposit, a producer's committed inputs and deposited outputs, and a need delivery SHALL all use the throttled quantity.

Source: GDD-15.1, ARCH-5.2, TDS-11.3

#### Scenario: A throttled source deposits the floored quantity
- **WHEN** a source plans `1000` output and has throttle `333` permille
- **THEN** it deposits `333`

#### Scenario: A throttled producer commits and deposits scaled amounts
- **WHEN** a completing producer plans `600` input and `400` output with throttle `500` permille
- **THEN** it commits `300` input and deposits `200` output

### Requirement: Zero-throughput producer deferral
A producer granted zero throughput SHALL remain `processing` at its completion duration without committing inputs or depositing outputs.

Source: GDD-15.1, TDS-11.3

#### Scenario: Zero throughput keeps the batch process waiting
- **WHEN** a completing batch producer has throttle `0` permille
- **THEN** it remains `processing` with progress at its duration and commits no inputs

### Requirement: Throughput throttling event
Phase 10 SHALL emit one `ThroughputThrottled` event per throttled requester, in ascending entity ID, carrying the requester, location, requested quantity, granted quantity, and throttle permille.

Source: GDD-15.1, TDS-17

#### Scenario: A throttled requester emits one event
- **WHEN** a requester is granted `500` of `1000` requested
- **THEN** phase 10 emits `ThroughputThrottled` with throttle `500`

### Requirement: Throughput allocation invariant
Every allocation SHALL satisfy INV-06: grants per location never exceed the location's capacity, each grant never exceeds its request, and each grant differs from its exact proportional share by less than one unit.

Source: INV-06, GDD-15.1, TDS-6.3

#### Scenario: INV-06 holds under over-capacity
- **WHEN** capacity is `1000` and requests are `700`, `500`, and `300`
- **THEN** the grants sum to `1000`, no grant exceeds its request, and each grant is within one unit of its exact share
