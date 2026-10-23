# Tasks

## 1. Schemas

- [x] 1.1 [CONT-6.17] Add the `unlocks` collection and target schema; regenerate the published JSON Schema. Verify: schema test for a well-formed unlock.
- [x] 1.2 [CONT-6.17] Add condition and target reference checks plus `invalid_unlock_target`. Verify: `[CONT-6.17]` unknown-target test.

## 2. Core

- [x] 2.1 [GDD-19] Add the `UnlockSystem` injection to `TickInput`/`TickContext`, implement phase 25, and add `not_unlocked` to the error registry. Verify: phase 25 wiring tests.
- [x] 2.2 [GDD-19] Gate `PlaceEntityPlan` in phase 01. Verify: `[GDD-19]` locked-definition rejection and untargeted-placement tests.

## 3. Content system

- [x] 3.1 [GDD-19] Implement `buildUnlockSystem` (compiled conditions, gated set, per-owner evaluation, reversible/persistent rules, `isAvailable`) and the owner-scoped `population_count` query. Verify: `[GDD-19]` evaluation, revocation, persistence, and availability tests.
- [x] 3.2 [TDS-14.3] Add owner-scoped sustained timers to `buildSustainedTimerUpdater`. Verify: `[TDS-14.3]` owner-timer test.

## 4. Metadata and wiring

- [x] 4.1 [PIC-4] Add the additive `locked` metadata field, the codec, the availability predicate, and the web-host wiring. Verify: `[PIC-4]` locked/unlocked metadata tests.
- [x] 4.2 [GDD-19] Wire the unlock system and owner query resolver into `session.advance`. Verify: session tests pass.

## 5. Documentation and verification

- [x] 5.1 Record the owner-timer-subject and global-scope clarifications (design); confirm `docs/08` needs no row change beyond archiving. Verify: no unintended document diff.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
