# sim/economy Specification

## Purpose

The owner balance model: balance resources that may go negative, population income scaled by satisfaction curves, and the phase-26 rules that credit income to owner accounts (GDD-7.5, GDD-11.3, GDD-20.2, CONT-6.3). Maintenance and the owner deficit policy extend this capability in later M4 rows.

## Requirements

### Requirement: Balance resources
A resource whose definition sets `allow_negative: true` SHALL be allowed to hold a negative quantity in the owning owner's account; every other stored quantity SHALL remain non-negative. An account transaction that would drive a non-balance resource below zero SHALL fail with `insufficient_balance`; one that drives a balance resource below zero SHALL succeed.

Source: GDD-7.5, CONT-6.3, ARCH-6

#### Scenario: A balance resource may go negative
- **WHEN** an account transaction applies a delta of `-100` to an owner's balance of a resource with `allow_negative: true` at balance `0`
- **THEN** the account holds `-100` and no error is raised

#### Scenario: A non-balance account cannot go negative
- **WHEN** an account transaction applies a delta of `-1` to an owner's balance of a resource without `allow_negative` at balance `0`
- **THEN** the transaction fails with `insufficient_balance` and the account keeps `0`

### Requirement: Content-derived negative-balance rules
The tick pipeline SHALL derive the set of negative-allowed resources from the loaded content, so that the same content produces the same transaction outcomes in every host and test harness without per-host configuration.

Source: GDD-7.5, TDS-12.2

#### Scenario: The same content yields the same outcome without configuration
- **WHEN** the full tick pipeline runs one tick that credits and then overdraws a balance resource, with no host-supplied environment
- **THEN** the account goes negative exactly as in a hand-driven transaction run with the same content

### Requirement: Owner account invariant
Invariant INV-01 SHALL treat an owner account entry below zero as a finding unless its resource declares `allow_negative`; inventory entries below zero remain findings in all cases.

Source: GDD-7.5, VER-8 (INV-01), CONT-6.3

#### Scenario: A negative balance without allow_negative is a finding
- **WHEN** an owner account holds `-5` of a resource without `allow_negative`
- **THEN** `checkInvariants` reports INV-01

#### Scenario: A negative balance of a balance resource is clean
- **WHEN** an owner account holds `-5` of a resource with `allow_negative: true`
- **THEN** `checkInvariants` reports no INV-01 finding

### Requirement: Population income
Phase 26 SHALL, for each residence in ascending entity ID and each resolved output in order, credit a normal-storage resource output to the account of the owner of the residence's location. A credit SHALL be `floor((count × rate_per_population_per_tick × curve(satisfaction_z) + carry) / 1000)` with the carry retained in `[0, 1000)`, where `curve` is the output's satisfaction curve evaluated at the residence's satisfaction Z in permille, and the full rate (`1000` permille) when no curve is configured. A residence with zero population, no location, or a location without owner SHALL produce nothing.

Source: GDD-11.3, GDD-20.2, ARCH-5.2 (phase 26), TDS-6.4

#### Scenario: Income is credited to the location owner
- **WHEN** a residence with population `10`, an owner-scoped output of rate `100`, and no satisfaction curve advances phase 26 under a location owned by owner `0`
- **THEN** owner `0`'s account for the output resource increases by `1000`

#### Scenario: The satisfaction curve scales income
- **WHEN** a residence with population `10`, rate `100`, and a satisfaction curve that maps `500` to `500` advances phase 26 while the residence's satisfaction Z is `500`
- **THEN** the owner's account increases by `500`

#### Scenario: Fractional income accumulates across ticks
- **WHEN** the scaled income for one tick is half a base unit for two consecutive ticks
- **THEN** the first tick credits `0` and the second credits `1`

#### Scenario: Zero population produces no income
- **WHEN** a residence with population `0` and an income output advances phase 26
- **THEN** no account changes and no event is emitted

#### Scenario: A residence without an owned location produces no income
- **WHEN** a residence with population `10` and an income output has no location, or its location has no owner
- **THEN** no account changes

### Requirement: Satisfaction curve resolution
Entity instantiation SHALL resolve a tier output's `satisfaction_curve` reference to the curve's definition handle; an unresolvable reference SHALL produce a content diagnostic. A tier output without `satisfaction_curve` SHALL use the full rate.

Source: GDD-11.3, CONT-6.10, TDS-20.2

#### Scenario: A configured curve is resolved at instantiation
- **WHEN** a package instantiates a tier whose income output declares `satisfaction_curve: test.curve.income`
- **THEN** the residence's income output carries the handle of `test.curve.income`

### Requirement: Income event attribution
A phase-26 income credit SHALL emit `PopulationOutputProduced` with the credited owner and the credited amount; capability outputs keep emitting without owner attribution.

Source: GDD-20.2, ARCH-9

#### Scenario: Income carries owner attribution
- **WHEN** a residence credits income of `1000` to owner `0`
- **THEN** a `PopulationOutputProduced` event names owner `0`, the residence, and amount `1000`
