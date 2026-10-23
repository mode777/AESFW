# Tasks

## 1. Content: deficit-policy schema, entity tags, enumeration

- [x] 1.1 Add `DeficitPolicySchema` (CONT-6.22) and the `deficit_policies` collection (`deficitPolicy` type); add optional `tags` to the entity-definition schema (CONT-6.8); regenerate the JSON Schema exports. Verify: schema unit tests + `packages/content/schemas/deficit_policies.json` committed.
- [x] 1.2 [CONT-6.22] Reference resolution: `resource` resolves; `duplicate_deficit_policy` when two policies name one resource. Verify: content unit tests.
- [x] 1.3 [TDS-7] Add optional `handlesOf` to core `Registry` and implement it in the content registry build (ascending handles). Verify: content registry unit test + empty-registry behavior.

## 2. Core: deficit runtime and command

- [x] 2.1 [GDD-20.3, CONT-6.22] `sim/economy/deficit.ts`: resolve policy data, comparison evaluation, net-rate helpers (D2), candidate selection with `exclude_tags`, pause ordering, pause/resume application with `DeficitPaused`/`DeficitResumed` events. Verify: L1 unit tests via `runPhases([27])`.
- [x] 2.2 [GDD-20.3] Unit tests: highest maintenance first; stop when net rate non-negative; excluded tag never paused; already-paused not re-paused; automatic reverse resume; `manual` never auto-resumes. Verify: same file.
- [x] 2.3 [TDS-16.2, ARCH-7.2] `ResumeDeficitPausedEntities` in the core command union and phase 01 (named entities / `all`, `unknown_entity` rejection); update phase-01 reads/writes. Verify: phase-01 unit tests.
- [x] 2.4 Implement phase 27 (reads/writes per proposal) and wire it into the pipeline. Verify: existing phase-27 no-op tests replaced; write-set checks pass.
- [x] 2.5 [GDD-20.3, INV-11] Integration: pipeline over `demo-economy` with a forced deficit pauses the producer (block reason `paused_by_deficit`, no maintenance charged) and resumes on recovery. Verify: testkit integration test with journal (`INV-11`, `INV-23` green).

## 3. App: session mapping and read model

- [x] 3.1 [TDS-16.1, PIC-12] `mapCommand` case for `ResumeDeficitPausedEntities` (`entities` array or `all`, else `unknown_command`). Verify: app session unit tests (three scenarios).
- [x] 3.2 [PIC-10.1] Entity detail sets `paused_by_deficit` and offers `ResumeDeficitPausedEntities` when paused. Verify: read-model unit tests (two scenarios).

## 4. Testkit: INV-23

- [x] 4.1 [GDD-20.2, INV-23] `checkOwnerBalanceConservation` in `checkInvariants` (journal present). Verify: invariant unit tests for both scenarios.

## 5. Fixtures

- [x] 5.1 Extend `fixtures/content/demo-economy` with a deficit policy (`trigger less 0`, `order [maintenance_desc, entity_id_asc]`, `stop_when net_rate_non_negative`, `resume automatic_reverse_order when greater_equal 0`); re-run the economy scenario clean. Verify: `aesfw validate --strict`; scenario findings empty.

## 6. Documentation and verification

- [x] 6.1 Run `pnpm trace`; confirm GDD-3.7, GDD-20.3, CONT-6.22, INV-11, INV-23 traces land and no new untraced IDs in claimed sections. Verify: `pnpm trace` output.
- [x] 6.2 Run `pnpm verify` and `pnpm trace`; all green, and no golden change beyond the explained ones (expected: none).
