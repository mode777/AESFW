# Proposal

## Why

Roadmap 08, M2 item 2.2 (`add-session-and-command-gateway`, capability `app/session`, size M). The thin client of M2 can mutate the world only through a session that validates, schedules, and applies commands. This row delivers the pure application session and the first command application in phase 01, and it retires part of R-07 (the presentation contract unworkable in practice) by proving the command gateway end to end. Depends on: `add-golden-basic-loop` (1.15) — archived 2026-10-21; `add-protocol-dtos` (2.1) — archived 2026-10-22.

## What Changes

- Add the pure `@aesfw/app` session (TDS-18.1): `SessionState`, `createSession`, `submitCommand`, `advance`, with the owned-mutation rule (05 §5.2).
- Add the command gateway (TDS-16.1 steps 1–5, TDS-18.2): decode a `CommandEnvelopeDto`, check the actor, referenced entities, and entity-scoped revision, and schedule at `max(requested_tick, world.tick + 1)` with a submission sequence.
- Add the revision semantics of TDS-18.3: `revision` increases per completed tick and per accepted command batch; `expected_session_revision` is checked against the referenced entities' `revision` component.
- Implement core phase 01 `applyCommands` for `SetEntityEnabled`, `SelectRecipe`, `SetProcessPriority`, and `SetCapabilityPriority`, emitting `CommandApplied`/`CommandRejected` domain events and `CommandOutcome`s (TDS-16.1 steps 6–7, ARCH-7).
- Add the internal `Command` union (TDS-16.2, the four in-scope types) and narrow `ScheduledCommand.command` from `JsonValue` to `Command`.
- Add the error-code registry `errors/codes.ts` with argument schemas (TDS-16.3).
- No **BREAKING** changes. Adding an optional `processPriority` field to `Producer` is **HASH-CHANGING only when a `SetProcessPriority` command runs**; existing fixtures omit it, so the M1 goldens are unchanged.

## Capabilities

### New Capabilities

- `app/session`: the pure session, command gateway, and revision semantics.

## Impact

- **Packages:** `@aesfw/app` gains `src/session/**`; `@aesfw/core` gains `src/commands/**`, `src/errors/codes.ts`, the phase-01 implementation, and the optional `Producer.processPriority` field.
- **Tick phases:** 01 (`applyCommands`). **Commands:** `SetEntityEnabled`, `SelectRecipe`, `SetProcessPriority`, `SetCapabilityPriority`. **Events:** `CommandApplied`, `CommandRejected`. **Error codes:** `state_revision_mismatch`, `unknown_entity`, `not_owner`, `invalid_recipe`, `unknown_capability`, `unknown_command`, `not_supported`.
- **Out of scope:** the remaining command types (3.3, 4.3, 6.4, 7.3, 7.4); projections and read models (2.3, 2.4); save/load (2.5); the worker host (2.6).
- **Verification impact:** `pnpm test` gains core phase-01 and app session tests; the M1 scenario goldens are unchanged.
