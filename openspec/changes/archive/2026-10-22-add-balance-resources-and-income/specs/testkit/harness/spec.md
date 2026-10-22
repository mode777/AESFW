# Spec Delta

## Purpose

INV-01 extends to owner accounts: a negative account entry is a finding unless the resource declares `allow_negative` (GDD-7.5).

## MODIFIED Requirements

### Requirement: checkInvariants framework
`checkInvariants(before, output, registry)` SHALL return the list of violated invariants among INV-01, INV-02, INV-03, INV-04, INV-05, INV-07, INV-08, INV-10, INV-18, INV-21, INV-22, and INV-24 as data, and `expectInvariants` SHALL throw an `InvariantViolation` naming the first finding when the list is non-empty. It SHALL cover:
- INV-01: no inventory stores a negative quantity, and no owner account entry is negative unless its resource declares `allow_negative`.
- INV-02: for every inventory and resource, the sum of active quantity reservations is at most the stored quantity.
- INV-03: for every inventory, stored quantity plus capacity reservations is at most each declared capacity rule (total and per resource).
- INV-04: when `output.journal` is present, for every resource the change in total stored quantity equals deposits minus withdrawals minus commits, and transfers net to zero.
- INV-05: for every capability pool, the sum of granted allocations is at most the pool supply, and each grant comes from the consumer's exact capability or an explicit substitute.
- INV-07: every population group has 0 ≤ count ≤ capacity.
- INV-08: every need fulfillment, category fulfillment, and residence satisfaction lies in `[0, 1000]`.
- INV-10: every store ID is below `nextEntityId`, and IDs are unique.
- INV-18: `hashWorld(decodeWorld(encodeWorld(output.world)))` equals `hashWorld(output.world)`.
- INV-21: a `step` produced an output rather than throwing, and `output.tick` is `before.tick + 1`.
- INV-22: every producer with a non-empty block-reason list is not `processing`, and every `processing` producer has no block reasons other than `throughput_throttled`.
- INV-24: each store's `ids()` is in ascending order.

Source: VER-6, INV-01, INV-02, INV-03, INV-04, INV-05, INV-07, INV-08, INV-10, INV-18, INV-21, INV-22, INV-24

#### Scenario: A valid empty world has no findings
- **WHEN** `checkInvariants` is called with a before-world and the output of stepping it
- **THEN** the findings list is empty and `expectInvariants` does not throw

#### Scenario: An entity ID at or beyond nextEntityId is reported
- **WHEN** the world holds an entity whose ID is not below `nextEntityId`
- **THEN** the findings contain INV-10

#### Scenario: A tick that did not advance is reported
- **WHEN** the output tick is not `before.tick + 1`
- **THEN** the findings contain INV-21

#### Scenario: Non-ascending store iteration is reported
- **WHEN** a store's `ids()` are not in ascending order
- **THEN** the findings contain INV-24

#### Scenario: A negative stored quantity is reported
- **WHEN** an inventory entry holds a negative quantity in the output world
- **THEN** the findings contain INV-01

#### Scenario: A negative account of a non-balance resource is reported
- **WHEN** an owner account entry holds a negative amount of a resource that does not declare `allow_negative`
- **THEN** the findings contain INV-01

#### Scenario: A negative account of a balance resource passes
- **WHEN** an owner account entry holds a negative amount of a resource that declares `allow_negative: true`
- **THEN** the findings contain no INV-01

#### Scenario: Reservations exceeding stored quantity are reported
- **WHEN** the ledger holds active quantity reservations above the stored quantity for an inventory and resource
- **THEN** the findings contain INV-02

#### Scenario: Capacity overrun is reported
- **WHEN** stored quantity plus capacity reservations exceeds an inventory's capacity rule
- **THEN** the findings contain INV-03

#### Scenario: A journal conservation violation is reported
- **WHEN** the journal is present and the change in total stored quantity of a resource does not equal deposits minus withdrawals minus commits
- **THEN** the findings contain INV-04

#### Scenario: A consistent journal passes conservation
- **WHEN** a tick journals a deposit of `200` and a commit of `50` and the total stored quantity changes by `150`
- **THEN** the findings contain no INV-04

#### Scenario: A capability over-allocation is reported
- **WHEN** the sum of granted allocations for a pool exceeds the supply of its providers
- **THEN** the findings contain INV-05

#### Scenario: A matching capability allocation passes
- **WHEN** a pool supplies `100` and its consumers are granted `100` in total
- **THEN** the findings contain no INV-05

#### Scenario: A blocked-but-processing producer is reported
- **WHEN** a producer is `processing` with a block reason other than `throughput_throttled`
- **THEN** the findings contain INV-22

#### Scenario: A consistent producer passes
- **WHEN** a producer is `processing` with no block reasons
- **THEN** the findings contain no INV-22

#### Scenario: A need fulfillment above 1000 is reported
- **WHEN** a need fulfillment is above `1000` in the output world
- **THEN** the findings contain INV-08

#### Scenario: A bounded satisfaction passes
- **WHEN** every fulfillment and satisfaction is in `[0, 1000]`
- **THEN** the findings contain no INV-08

#### Scenario: A population above capacity is reported
- **WHEN** a population group has a count above its capacity
- **THEN** the findings contain INV-07

#### Scenario: A bounded population passes
- **WHEN** every population group has a count in [0, capacity]
- **THEN** the findings contain no INV-07
