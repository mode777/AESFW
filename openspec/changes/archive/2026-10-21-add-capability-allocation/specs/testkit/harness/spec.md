# Spec Delta

## MODIFIED Requirements

### Requirement: checkInvariants framework
`checkInvariants(before, output, registry)` SHALL return the list of violated invariants among INV-01, INV-02, INV-03, INV-04, INV-05, INV-10, INV-18, INV-21, and INV-24 as data, and `expectInvariants` SHALL throw an `InvariantViolation` naming the first finding when the list is non-empty. It SHALL cover:
- INV-01: no inventory stores a negative quantity.
- INV-02: for every inventory and resource, the sum of active quantity reservations is at most the stored quantity.
- INV-03: for every inventory, stored quantity plus capacity reservations is at most each declared capacity rule (total and per resource).
- INV-04: when `output.journal` is present, for every resource the change in total stored quantity equals deposits minus withdrawals minus commits, and transfers net to zero.
- INV-05: for every capability pool, the sum of granted allocations is at most the pool supply, and each grant comes from the consumer's exact capability or an explicit substitute.
- INV-10: every store ID is below `nextEntityId`, and IDs are unique.
- INV-18: `hashWorld(decodeWorld(encodeWorld(output.world)))` equals `hashWorld(output.world)`.
- INV-21: a `step` produced an output rather than throwing, and `output.tick` is `before.tick + 1`.
- INV-24: each store's `ids()` is in ascending order.

Source: VER-6, INV-01, INV-02, INV-03, INV-04, INV-05, INV-10, INV-18, INV-21, INV-24

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
