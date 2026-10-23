# Tasks

## 1. Schemas

- [x] 1.1 [CONT-6.19] Add the `satisfaction_bands` collection and band/effect schemas; regenerate the published JSON Schema. Verify: schema tests for the well-formed and zero-start scenarios.
- [x] 1.2 [CONT-6.10, CONT-6.19] Add the tier `satisfaction` object and band reference checks; add the ordering/coverage diagnostics. Verify: `[CONT-6.19]` tests for the unsorted and non-zero-start scenarios and the tier reference.

## 2. Core

- [x] 2.1 [GDD-12.6] Add `bandTableOf`, `bandIndexFor`, `updateBands`, and the `BandState` type; add `Residence.bands` and `resolveGrowthPolicy`. Verify: `[GDD-12.6]` tests for selection, resolved effects, and the growth override.
- [x] 2.2 [GDD-12.6] Wire phase 22 (bands after timers) and phase 23 (growth override). Verify: phase 22 tests and the growth-override scenario.
- [x] 2.3 [GDD-12.6, GDD-20.2] Apply the band output multiplier in phase 26. Verify: `[GDD-12.6]` income-multiplier test.

## 3. Invariant and instantiation

- [x] 3.1 [INV-09] Add the band check to `checkInvariants`. Verify: `[INV-09]` missing-band-state test.
- [x] 3.2 [CONT-6.10] Resolve the tier's `satisfaction` bands and aggregation in `@aesfw/app` instantiation. Verify: instantiation and content tests pass.

## 4. Documentation and verification

- [x] 4.1 Record the grace-counter clarification and the deferred transition reference (design); confirm `docs/08` needs no row change beyond archiving. Verify: no unintended document diff.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
