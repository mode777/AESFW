# Tasks

## 1. Core commands and errors (design D1, D6)

- [x] 1.1 Create `packages/core/src/commands/types.ts` with the `Command` union, `CommandOutcome`, and `CommandError`; narrow `ScheduledCommand.command` to `Command`.
- [x] 1.2 Create `packages/core/src/errors/codes.ts` with `ERROR_CODES` and argument schemas.
- [x] 1.3 Add the optional `processPriority?: Int` field to `Producer`.
- [x] 1.4 Export the new types from `packages/core/src/index.ts`.

## 2. Phase 01 (design D2, D5, D7)

- [x] 2.1 Merge `input.commands` into `world.commandQueue` in `execute` (idempotent by command id).
- [x] 2.2 Implement `packages/core/src/systems/phase-01-apply-commands.ts` with the four command handlers, events, and outcomes.

## 3. App session (design D3, D4)

- [x] 3.1 Create `packages/app/src/session/types.ts` (`SessionState`, `SessionOptions`, `SessionSettings`, `AcceptedCommandRecord`, `HashCheckpoint`).
- [x] 3.2 Create `packages/app/src/session/session.ts` with `createSession`, `submitCommand`, and `advance`.
- [x] 3.3 Export the session API from `packages/app/src/index.ts`.

## 4. Tests

- [x] 4.1 `packages/core/src/systems/phase-01-apply-commands.test.ts` — the four commands nominal, `invalid_recipe`, `unknown_entity`, ordering. [TDS-16.1, ARCH-5.2]
- [x] 4.2 `packages/core/src/errors/codes.test.ts` — the registry declares the revision arguments. [TDS-16.3]
- [x] 4.3 `packages/app/src/session/session.test.ts` — creation, accepted scheduling, `not_owner`, `unknown_entity`, stale revision, no-revision acceptance, advance. [TDS-18.1, TDS-18.2, TDS-18.3]

## 5. Documentation and verification

- [x] 5.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 5.2 Confirm no amendment to 01–07 is required.
- [x] 5.3 Run `pnpm verify` and `pnpm trace`; all green, no new untraced requirement IDs in the claimed sections, and the M1 scenario goldens unchanged. [TDS-16, TDS-18]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.2 with "✓ archived <date>" in `docs/08`.
