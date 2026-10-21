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
`checkInvariants(before, output, registry)` SHALL return the list of violated invariants among INV-10, INV-18, INV-21, and INV-24 as data, and `expectInvariants` SHALL throw an `InvariantViolation` naming the first finding when the list is non-empty. It SHALL cover:
- INV-10: every store ID is below `nextEntityId`, and IDs are unique.
- INV-18: `hashWorld(decodeWorld(encodeWorld(output.world)))` equals `hashWorld(output.world)`.
- INV-21: a `step` produced an output rather than throwing, and `output.tick` is `before.tick + 1`.
- INV-24: each store's `ids()` is in ascending order.

Source: VER-6, INV-10, INV-18, INV-21, INV-24

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
