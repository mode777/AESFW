# kernel/tick-pipeline — Spec Delta

## Purpose

The fixed, framework-owned tick pipeline: the phase table of 02 §5.2 as registered system modules, the system contract with declared reads and writes, the tick context and event writer, `step` and `runPhases`, and write-set enforcement in test builds (TDS-10, TDS-11, ARCH-5).

## ADDED Requirements

### Requirement: Phase table completeness and order
`phaseTable` SHALL contain exactly one `SystemDescriptor` for each phase 01–31 of TDS-11.1, in canonical ascending phase order, with the system name of TDS-11.1. Phases 32 (event ordering) and 33 (snapshot publication) SHALL NOT be system modules; they are pipeline and application-layer responsibilities.

Source: TDS-11.1, ARCH-5.2

#### Scenario: The phase table lists phases 1 to 31 in order
- **WHEN** `phaseTable` is inspected
- **THEN** its phases are exactly `1..31` in ascending order with names `applyCommands`, `applyModuleEffects`, …, `recordMetricsAndHash`

#### Scenario: Phases 32 and 33 are not system modules
- **WHEN** `phaseTable` is inspected
- **THEN** no descriptor has phase `32` or `33`

### Requirement: System contract
A `SystemDescriptor` SHALL carry a `phase`, a `name`, `reads` and `writes` store-key lists, and a `run(ctx)` function. A `TickContext` SHALL carry the computed `tick`, the `registry`, the `world`, a `tx` transaction writer, an `events` event writer, a per-tick `scratch`, and a `policies` set. A system SHALL receive `tick` equal to `world.tick + 1` (TDS-11.3 rule 5).

Source: TDS-11.2, TDS-11.3

#### Scenario: A system sees the computed tick
- **WHEN** a system runs during `step` on a world at tick `4`
- **THEN** the context tick is `5`

### Requirement: step runs the whole pipeline
`step(world, registry, input)` SHALL run every phase 01–31 in canonical order, set `world.tick` to the computed tick, and return a `TickOutput` with `world` (the same reference), `tick`, `events`, `outcomes`, `journal`, `hash`, and `metrics`. When `options.hash` is true the output `hash` SHALL be `hashWorld(world, registry)`; when `options.journal` is true the journal SHALL be an array, otherwise `null`. Turning hashing or journaling on or off SHALL NOT change authoritative state (TDS-10.1).

Source: TDS-10.1, TDS-11.1, TDS-11.3

#### Scenario: An empty world advances one tick
- **WHEN** `step` runs on a fresh world with `hash: false` and `journal: false`
- **THEN** `output.tick` is `1`, `world.tick` is `1`, and `output.world` is the same object as the input world

#### Scenario: Hashing produces a state hash without changing state
- **WHEN** `step` runs with `hash: true` and then the same starting state runs with `hash: false`
- **THEN** the first output has a 16-hex-character hash and both runs end at the same state hash

#### Scenario: Journaling is opt-in
- **WHEN** `step` runs with `journal: true` and then with `journal: false`
- **THEN** the first output journal is `[]` and the second is `null`

### Requirement: Events carry the computed tick and a monotonic sequence
The `EventWriter` SHALL assign each emitted `DomainEvent` a `seq` that increases monotonically within the tick starting at `0`, and SHALL stamp the event with the computed tick. `TickOutput.events` SHALL be the events in emission order.

Source: TDS-17, TDS-11.3

#### Scenario: Emitted events are sequenced in order
- **WHEN** two events are emitted during one tick
- **THEN** their sequences are `0` and `1`, and both carry the computed tick

### Requirement: runPhases runs a subset in canonical order
`runPhases(world, registry, phases, input)` (in `@aesfw/core/testing`) SHALL run only the listed phases, in canonical ascending order, inside one tick, and SHALL advance `world.tick` to the computed tick like `step`. Phases not listed SHALL NOT run.

Source: TDS-10.3

#### Scenario: Only the requested phases run
- **WHEN** `runPhases(world, registry, [13, 7], input)` is evaluated
- **THEN** phases `7` and `13` run in that order and no other phase runs, and `world.tick` advances by one

### Requirement: Write-set enforcement in test builds
In test builds, a store that a system does not list in its `writes` SHALL be read-only for that system's `run`, so an undeclared write throws; a store listed in `writes` SHALL be writable. A test harness SHALL be able to run a single descriptor with these checks.

Source: TDS-11.2, VER-5.4

#### Scenario: An undeclared write throws
- **WHEN** a descriptor with `writes: []` calls `set` on a component store during its run
- **THEN** the run throws an `InvariantViolation`

#### Scenario: A declared write is allowed
- **WHEN** a descriptor declares a store kind in `writes` and calls `set` on it during its run
- **THEN** the run completes and the store holds the value

### Requirement: Later-row seams are registered no-ops or typed not-supported results
Behavior owned by later roadmap rows SHALL be a registered no-op or a typed not-supported result: `TransactionWriter.atomic` SHALL return `err` with a `not_implemented` diagnostic until `add-inventory-transactions` (1.7), and `PolicySet` SHALL be empty until the policy rows (1.8+).

Source: TDS-12.2, TDS-13

#### Scenario: Transactions are not implemented yet
- **WHEN** `ctx.tx.atomic(...)` is called
- **THEN** it returns `err` with a diagnostic whose code is `not_implemented`
