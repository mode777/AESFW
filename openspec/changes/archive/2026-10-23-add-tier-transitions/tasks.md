# Tasks

## 1. Schemas

- [x] 1.1 [CONT-6.15] Add the `transitions` collection; tier `decline_transitions`; residence `empty_residence`; regenerate the published JSON Schema. Verify: schema tests.
- [x] 1.2 [CONT-6.15, GDD-9.3] Add reference checks for tiers, condition, costs, refunds, conversion definition, decline transitions, and revert targets. Verify: `[CONT-6.15]` reference tests.

## 2. Core

- [x] 2.1 [GDD-13] Add transition runtime types, definition parsing, decline/empty-policy resolution, and `residenceFromDefinition`. Verify: type-check and definition unit tests.
- [x] 2.2 [GDD-13.1] Implement cost atomicity and `startTransition`. Verify: `[GDD-13.1]` command tests for apply, mismatches, ineligibility, and shortage.
- [x] 2.3 [GDD-13.3] Implement completion with conversion and refunds. Verify: `[GDD-13.3]` clamp and refund tests.
- [x] 2.4 [GDD-13.4, GDD-9.3] Implement automatic/decline triggers and empty-residence policies. Verify: `[GDD-13.4]` decline and revert tests.
- [x] 2.5 [GDD-13] Wire phase 24 and the `RequestPopulationTransition` command; add error codes. Verify: write-set tests and full suite.

## 3. Band integration and app

- [x] 3.1 [GDD-12.6] Resolve band `trigger_decline` transitions and carry the decline fields in `bandState`. Verify: band tests.
- [x] 3.2 [TDS-16.2] Parse `RequestPopulationTransition` in the session. Verify: session tests pass.

## 4. Documentation and verification

- [x] 4.1 Record the clarifications (design); confirm `docs/08` needs no row change beyond archiving. Verify: no unintended document diff.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
