# Spec Delta

## Purpose

The `sustained` temporal operator (CONT-7.2) lets a condition hold only after its inner condition has been continuously true for a configured number of ticks, backed by authoritative, saved timer state updated in phase 22.

## ADDED Requirements

### Requirement: Sustained compilation
The compiler SHALL accept a `sustained` node of the shape `{ ticks, condition }` where `ticks` is a positive safe integer and `condition` compiles to a boolean expression, and SHALL report `condition_ticks_invalid` for a non-integer or non-positive `ticks` and the existing shape and type diagnostics for a malformed or non-boolean inner expression. A `sustained` node SHALL compile to a boolean expression.

Source: CONT-7.2, CONT-7.3, TDS-14.1, TDS-14.3

#### Scenario: A sustained node compiles with a deterministic slot
- **WHEN** a condition compiles the expression `all: [sustained: {ticks: 60, condition: true}, sustained: {ticks: 30, condition: true}]`
- **THEN** compilation succeeds and the two nodes carry slots `0` and `1` in pre-order

#### Scenario: A non-positive ticks value is a diagnostic
- **WHEN** a condition compiles `sustained: {ticks: 0, condition: true}`
- **THEN** the diagnostic `condition_ticks_invalid` is reported and no condition is produced

#### Scenario: A non-boolean inner expression is a type error
- **WHEN** a condition compiles `sustained: {ticks: 10, condition: 5}`
- **THEN** the diagnostic `condition_type_error` reporting expected `bool` is reported

### Requirement: Sustained evaluation reads the timer
Evaluating a `sustained` node SHALL return `consecutiveTrueTicks >= ticks` from the timer keyed by `(condition handle, slot, subject)` and SHALL NOT evaluate its inner expression at read time. An absent timer SHALL read as `0` consecutive ticks.

Source: TDS-14.1, TDS-14.3

#### Scenario: A timer at or above the threshold holds
- **WHEN** the timer for `(condition, slot 0, subject)` stores `60` consecutive ticks and the node requires `ticks: 60`
- **THEN** evaluation returns `true`

#### Scenario: A missing timer does not hold
- **WHEN** no timer exists for `(condition, slot 0, subject)` and the node requires `ticks: 1`
- **THEN** evaluation returns `false`

### Requirement: Phase 22 timer updates
Phase 22 SHALL, for every condition definition that contains `sustained` nodes, evaluate each node's inner expression for every subject in the condition's usage scope, in ascending `(condition handle, slot, subject)` order, and set the timer to the previous value plus one when the inner expression holds and to `0` when it does not. In v1 the usage scope of a condition referenced from an entity-definition component field SHALL be the entities carrying that component.

Source: TDS-14.3, ARCH-5.2

#### Scenario: A continuously true inner expression accumulates
- **WHEN** an entity's source condition contains `sustained: {ticks: 3, condition: true}` and the world steps `3` ticks
- **THEN** after the third tick the timer stores `3` consecutive ticks and the sustained read holds

#### Scenario: A false inner expression resets the timer
- **WHEN** an entity's timer stores `5` consecutive ticks and the inner expression evaluates `false` on the next tick
- **THEN** the timer stores `0` consecutive ticks and the sustained read no longer holds

#### Scenario: Subjects are updated in ascending order per condition and slot
- **WHEN** two entities with ids `2` and `1` carry the same condition usage and the phase runs
- **THEN** the timer rows are ordered by `(condition handle, slot, subject)` with subject `1` before subject `2`

### Requirement: Phase 30 timer cleanup
Phase 30 SHALL delete every timer instance whose subject entity no longer exists.

Source: TDS-14.3

#### Scenario: A removed entity's timers are deleted
- **WHEN** an entity with a timer at `4` consecutive ticks is removed
- **THEN** after the next phase 30 the timer row for that subject no longer exists

### Requirement: Timer persistence and determinism
Sustained timers SHALL be authoritative world state: they SHALL be encoded in and decoded from the save document, contribute to the state hash, and survive a save → load → continue run with identical hashes to an uninterrupted run.

Source: TDS-14.3, CONT-7.2, ARCH-15.1

#### Scenario: Save and reload preserves timer progress
- **WHEN** a world with a timer at `7` consecutive ticks is saved, loaded, and stepped once with the inner expression `true`
- **THEN** the reloaded world's timer stores `8` consecutive ticks and its state hash equals the uninterrupted run's hash at the same tick
