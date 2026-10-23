# Tasks

## 1. Types and compiler

- [x] 1.1 [TDS-14.1] Add the `sustained` variant to `Expr` in `packages/content/src/conditions/expr.ts` and the `condition_ticks_invalid` diagnostic code to the catalogue. Verify: type-check and diagnostics catalogue test.
- [x] 1.2 [CONT-7.2, TDS-14.3] Compile `sustained: { ticks, condition }` with positive-integer validation, bool inner type check, and pre-order slot assignment; add `sustainedSlots(root)`. Verify: `[CONT-7.2]` compiler unit tests for the slot, `condition_ticks_invalid`, and type-error scenarios.

## 2. Evaluator and wiring

- [x] 2.1 [TDS-14.3] Add `timer` to `EvalContext`; `sustained` evaluates `timer(slot) >= ticks` without evaluating `inner`. Verify: `[TDS-14.3]` evaluator unit tests for hold, not-hold, and missing-timer scenarios.
- [x] 2.2 [TDS-14.3] Build `SustainedTimerUpdater` on `TickInput`/`TickContext` in core (default no-op) and implement `buildSustainedTimerUpdater` in `@aesfw/content` (condition enumeration, v1 resource-source scopes, ascending `(condition, slot, subject)` update rule, design D5). Verify: content unit tests for accumulation, reset, and ordering scenarios.
- [x] 2.3 [TDS-14.3] Wire the updater in `session.advance` next to the condition evaluator; extend the app placement/source evaluator's `timer` to read `world.timers`. Verify: app session test with a sustained source condition.

## 3. Systems

- [x] 3.1 [TDS-14.3, ARCH-5.2] Implement phase 22 `updateTimersAndBands` (timers only) calling the injected updater with `writes: ['timers']`. Verify: `runPhases([22])` unit tests for accumulation, reset, ordering, and no-op-default scenarios.
- [x] 3.2 [TDS-14.3] Extend phase 30 `finalizeLifecycle` to delete timer rows of removed subjects (`writes` gains `'timers'`). Verify: `[TDS-14.3]` cleanup unit test.

## 4. Persistence and determinism

- [x] 4.1 [ARCH-15.1, TDS-14.3] Save → load → continue test asserting the timer round-trips and hashes match an uninterrupted run. Verify: `[TDS-14.3]` persistence test in content or app.

## 5. Documentation and verification

- [x] 5.1 Record the v1 scope clarification in the design (no doc amendment required); confirm `docs/08` needs no row change. Verify: no unintended document diff.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
