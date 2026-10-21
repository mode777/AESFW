# testkit/harness Specification

## Purpose

The shared test harness of the framework: a store-level world builder, the `checkInvariants` framework over the M0 subset of the invariant catalogue, and the double-run, clone-run, and save-continue determinism harnesses that every later system and scenario test uses (VER-5.2, VER-6, VER-8.1).

## Requirements

### Requirement: Store-level world builder
`world(registry?)` SHALL return a fluent builder that produces a `World` through `@aesfw/core` public paths, allowing a test to set the seed, the starting tick, owner states, and component-store values, and SHALL default to an empty registry and empty content. The builder SHALL NOT bypass the world model's invariants.

Source: VER-5.2

#### Scenario: The builder produces the requested state
- **WHEN** `world().seed([3, 4]).tick(10).owner(owner).store('producer', 1, value).build()` is evaluated
- **THEN** the world has seed `[3, 4]`, tick `10`, the owner in its table, and `value` in the `producer` store for entity `1`

### Requirement: checkInvariants framework
`checkInvariants(before, output, registry)` SHALL return the list of violated invariants among INV-01, INV-02, INV-03, INV-04, INV-05, INV-07, INV-08, INV-10, INV-18, INV-21, INV-22, and INV-24 as data, and `expectInvariants` SHALL throw an `InvariantViolation` naming the first finding when the list is non-empty. It SHALL cover:
- INV-01: no inventory stores a negative quantity.
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

### Requirement: Clone-run harness
`cloneRun(world, registry, input)` SHALL clone the world, step the original and the clone with the same input, and report success only when their state hashes, events, and outcomes are identical (INV-17).

Source: VER-8.1, INV-17

#### Scenario: A clone run matches the original
- **WHEN** `cloneRun` runs on an empty world
- **THEN** the report is successful

### Requirement: Double-run harness
`doubleRun(world, registry, ticks, options?)` SHALL run the same scenario twice from fresh clones of the input world, recording hash checkpoints, and report success only when both checkpoint sequences are identical.

Source: VER-8.1

#### Scenario: A double run produces identical checkpoints
- **WHEN** `doubleRun` runs on an empty world for `100` ticks with a checkpoint interval of `10`
- **THEN** the report is successful and has `10` checkpoints

### Requirement: Save-continue harness
`saveContinue(world, registry, totalTicks, saveAtTick)` SHALL run the world uninterrupted to `totalTicks`, run a second copy to `saveAtTick`, encode and decode it, continue the decoded world to `totalTicks`, and report success only when the final hashes match (INV-18).

Source: VER-8.1, INV-18

#### Scenario: A save and continue reproduces the uninterrupted run
- **WHEN** `saveContinue` runs on an empty world for `200` ticks saving at `100`
- **THEN** the report is successful

### Requirement: Determinism assertion helpers
`expectHashStable(run)` SHALL run the supplied thunk twice and throw when the two returned hashes differ. `expectSameState(a, b, registry)` SHALL throw when the two worlds' state hashes differ.

Source: VER-5.2

#### Scenario: Identical runs pass the stability assertion
- **WHEN** `expectHashStable` is called with a thunk that returns the same hash both times
- **THEN** it does not throw

#### Scenario: Different states fail the equality assertion
- **WHEN** `expectSameState` is called with two worlds at different ticks
- **THEN** it throws

### Requirement: Content builder
`content()` SHALL return a fluent builder that accumulates definitions per definition collection, sets the package id and version, and compiles them through `loadContent` from an in-memory `PackageSource`. `build()` SHALL return a `ContentBuildResult` carrying the compiled content (or `null`), the registry (or `null`), the checksum (or `null`), and the diagnostics. The builder SHALL NOT bypass the real content pipeline.

Source: VER-5.2

#### Scenario: The builder compiles definitions through the pipeline
- **WHEN** `content().define('resources', resource).define('recipes', recipe).build()` is evaluated
- **THEN** the result has non-null content, a registry containing the resource, and a checksum

#### Scenario: The builder surfaces pipeline diagnostics
- **WHEN** a defined recipe references an absent resource
- **THEN** the result has `null` content and an error-severity diagnostic

### Requirement: Content query helpers
`definitionsOf(registry, type)` SHALL return the compiled definitions of a type, and `definitionById(registry, type, id)` SHALL return the compiled definition for an id or `null`.

Source: VER-5.2

#### Scenario: A definition is found by id
- **WHEN** `definitionById` is called for a resource defined through the builder
- **THEN** it returns the compiled definition with that id

#### Scenario: An absent definition returns null
- **WHEN** `definitionById` is called for an unknown id
- **THEN** it returns `null`

### Requirement: Content assertion helpers
`expectContentOk(result)` SHALL return the compiled content and throw an `InvariantViolation` carrying the diagnostics when content is `null`. `expectNoDiagnostics(result)` SHALL throw when the result has any diagnostic. `diagnosticCodes(result)` SHALL return the diagnostic codes in order.

Source: VER-5.2

#### Scenario: A successful build passes the assertion
- **WHEN** `expectContentOk` is called on a successful build
- **THEN** it returns the compiled content

#### Scenario: A failed build throws
- **WHEN** `expectContentOk` is called on a build whose content is `null`
- **THEN** it throws an `InvariantViolation`

#### Scenario: Diagnostics are summarised as codes
- **WHEN** `diagnosticCodes` is called on a result with diagnostics
- **THEN** it returns their codes in order

