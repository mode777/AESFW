# Proposal

## Why

Roadmap 08, M7 item 7.1 (`add-sustained-conditions`). The condition language of 1.6 deliberately excludes `sustained` (CONT-7.2), so no condition can express "continuously true for N ticks" — the mechanic behind advancement thresholds and decline grace periods (GDD-13.2) and the grace timers of 7.2. This change adds `sustained` compilation, the authoritative timer table, phase 22 timer updates, and their persistence, retiring the progression-condition part of R-08 and unblocking 7.2, 7.3, and 7.5.

## What Changes

- The compiled expression tree gains the `sustained` node (TDS-14.1): `{ ticks, slot, inner }`. The compiler accepts `sustained: { ticks, condition }` (CONT-7.2/7.3), validates a positive integer `ticks` and a boolean inner expression, and assigns each `sustained` node in a condition a deterministic `TimerSlot`.
- Evaluation of `sustained` reads the authoritative timer instead of evaluating the inner expression: it holds when `consecutiveTrueTicks >= ticks`.
- Phase 22 `updateTimersAndBands` becomes live for timers: for every condition that contains `sustained` nodes, it evaluates the inner expression for every subject in the usage scope (v1: entities whose definition references the condition through a component field), in ascending `(condition handle, slot, subject)` order, and increments or resets the timer (TDS-14.3).
- Timer instances of removed subjects are deleted in phase 30 (TDS-14.3).
- Timers are authoritative world state: they are encoded, decoded, hashed, and cloned like every other store, and a save → load → continue run keeps timer progress.
- Theme-free fixture and unit coverage for compilation, evaluation, timer updates, exclusions, ordering, persistence, and cleanup.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `content/conditions`: the `sustained` operator, its compilation, timer-slot assignment, evaluation, and the phase 22/30 timer semantics.

## Impact

- **Packages:** `@aesfw/content` (expression tree, compiler, evaluator, timer updater), `@aesfw/core` (phase 22/30 systems, `TickInput` injection), `@aesfw/app` (session wiring), `fixtures/` (theme-free coverage).
- **Tick phases:** phase 22 `updateTimersAndBands` (reads `timers`; writes `timers`), phase 30 `finalizeLifecycle` (writes `timers` for orphan cleanup).
- **Store kinds:** `timers` (already in the v1 catalogue and codec; values become populated).
- **Commands/events:** none new. **Error codes:** none. **Diagnostic codes:** `condition_ticks_invalid` for a non-positive or non-integer `ticks`.
- **Protocol/save format:** no change; `timers` are already part of the v1 save document and hash. **HASH-CHANGING:** no — no shipped fixture uses `sustained`, so existing goldens are unchanged.
- **Dependencies on archived changes:** 1.6 `add-condition-and-curve-compiler` (archived 2026-10-21) and 2.5 `add-save-load` (archived 2026-10-22).

## Out of Scope

- 7.2 `add-satisfaction-bands`: band tables, effects, grace timers, INV-09 (the other half of phase 22).
- 7.3 `add-tier-transitions`: residence-of-source-tier timer scopes and transition conditions.
- 7.5 `add-unlocks`: owner-scoped timer scopes for unlock conditions.
- 7.7 `add-transition-eligibility-read-model`: exposing sustained-timer progress in projections.
