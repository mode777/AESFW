# Spec Delta

## Purpose

The capability model: provider, consumer, and allocation state; the per-tick rebuild of location-, owner-, and global-scoped capability pools (phase 05); and the deterministic allocation of those pools to consumers under the binary, proportional, priority, and weighted models, with exact matching and explicit substitutes (phase 06) (GDD-14, ARCH-13, TDS-6.3).

## ADDED Requirements

### Requirement: Capability state
A `capabilityProvider` SHALL carry a capability handle, a scope (`location`, `owner`, or `global`), a location for location scope, and a per-tick rate. A `capabilityConsumer` SHALL carry a capability handle, its explicit substitutes in ascending handle order, a scope, a location, an allocation model, a priority, a weight, and a request. A `capabilityAllocation` SHALL carry the granted amount and the shortage.

Source: GDD-14.1, ARCH-13

#### Scenario: A provider and consumer are stored
- **WHEN** a provider with rate `100` and a consumer with request `60` are set in the world
- **THEN** reading them returns those values

### Requirement: Capability supply rebuild
Phase 05 SHALL clear the per-tick pools and aggregate every provider's rate by `(scope, location, capability)`, iterating providers in ascending entity-ID order. It SHALL write no authoritative store other than the per-tick pool scratch.

Source: ARCH-13, GDD-14.1

#### Scenario: Provider rates aggregate by pool
- **WHEN** two location-scoped providers at location `1` supply `40` and `60` of the same capability
- **THEN** the pool for `(location, 1, capability)` holds `100`

#### Scenario: Different scopes do not mix
- **WHEN** a location-scoped and a global provider supply the same capability
- **THEN** they aggregate into separate pools

### Requirement: Capability allocation by model
Phase 06 SHALL, for each pool, gather the consumers whose capability or substitutes include that pool's capability and whose scope and location match, in ascending entity-ID order, and allocate the pool under the model of the lowest-ID consumer. It SHALL publish one `capabilityAllocation` per consumer with `granted` and `shortage = request − granted`, and SHALL emit a shortage event for each consumer with a non-zero shortage.

Source: GDD-14.2, ARCH-13

#### Scenario: A pool within demand is fully granted
- **WHEN** a pool holds `100` and one consumer requests `60` under proportional
- **THEN** the consumer's allocation is `granted: 60, shortage: 0`

#### Scenario: Proportional allocation splits deterministically
- **WHEN** a pool holds `100` and consumers `1` and `2` request `100` each
- **THEN** each is granted `50`

#### Scenario: Binary allocation grants all or nothing
- **WHEN** a pool holds `100` and consumer `1` requests `60` and consumer `2` requests `50` under binary
- **THEN** consumer `1` is granted `60` and consumer `2` is granted `0`

#### Scenario: Priority allocation serves lower priority numbers first
- **WHEN** a pool holds `100` and consumer `1` (priority `2`) requests `60` and consumer `2` (priority `1`) requests `60` under priority
- **THEN** consumer `2` is granted `60` and consumer `1` is granted `40`

#### Scenario: Weighted allocation follows weights
- **WHEN** a pool holds `300`, consumer `1` (weight `1000`) requests `300`, and consumer `2` (weight `2000`) requests `300` under weighted
- **THEN** consumer `1` is granted `100` and consumer `2` is granted `200`

#### Scenario: A shortage is reported
- **WHEN** a pool holds `10` and one consumer requests `50`
- **THEN** the allocation is `granted: 10, shortage: 40` and a shortage event is emitted

### Requirement: Exact matching and substitutes
A consumer SHALL draw only from the pool of its capability or from pools of its explicit substitutes, exact capability first, then substitutes in ascending handle order. It SHALL NOT draw from any other capability.

Source: GDD-4.7, GDD-14.1

#### Scenario: A consumer does not draw from an unrelated capability
- **WHEN** a consumer requests capability `0` with no substitutes and only capability `1` has supply
- **THEN** the consumer's allocation is `granted: 0`

#### Scenario: A consumer draws from an explicit substitute
- **WHEN** a consumer requests capability `0` with substitute `1`, capability `0` has no supply, and capability `1` holds `40`
- **THEN** the consumer is granted `40` from capability `1`

### Requirement: Inactive and zero-request exclusion
Phase 06 SHALL exclude a consumer with a non-positive request, and SHALL allocate nothing to a consumer at an inactive location.

Source: 06 §5.3, GDD-6.2

#### Scenario: A zero request receives nothing
- **WHEN** a pool holds `100` and a consumer requests `0`
- **THEN** the consumer's allocation is `granted: 0, shortage: 0`

### Requirement: Capability allocation never exceeds supply
For every pool, the sum of granted amounts SHALL be at most the pool supply, and every grant SHALL come from the consumer's exact capability or an explicit substitute (INV-05).

Source: INV-05, GDD-4.7

#### Scenario: Total grants do not exceed supply
- **WHEN** a pool holds `100` and three consumers request `100` each
- **THEN** the granted amounts sum to at most `100`
