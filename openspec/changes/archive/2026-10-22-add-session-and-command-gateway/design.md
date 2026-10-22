# Design — add-session-and-command-gateway

## Context

`add-protocol-dtos` (2.1) is archived: the command envelope and result DTOs and their codecs exist. `add-golden-basic-loop` (1.15) is archived: the demo basic loop runs. Core phase 01 is a registered no-op and `ScheduledCommand.command` is `JsonValue`. TDS-16, TDS-18.1–18.3, and ARCH-7 fix the behaviour. This document records the decisions those sections leave open.

## Goals / Non-Goals

**Goals:** the pure session, gateway, revision semantics, phase-01 application of the four in-scope commands, and the error-code registry.

**Non-Goals:** the other command types (3.3, 4.3, 6.4, 7.3, 7.4); projections (2.3); read models (2.4); save/load (2.5); the worker host (2.6).

## Decisions

### D1 — Internal `Command` union and `ScheduledCommand`

`packages/core/src/commands/types.ts` defines the `Command` discriminated union with exactly the four in-scope types (`SetEntityEnabled`, `SelectRecipe`, `SetProcessPriority`, `SetCapabilityPriority`). Later rows extend the union. `ScheduledCommand.command` narrows from `JsonValue` to `Command`. `CommandOutcome` narrows to `{ commandId; status: 'applied'; tick } | { commandId; status: 'rejected'; tick; errors: readonly CommandError[] }`, where `CommandError` is `{ code; arguments }`.

### D2 — How phase 01 receives commands

`TickInput.commands` are the commands scheduled for exactly `world.tick + 1` (TDS-10.1). `execute` merges `input.commands` into `world.commandQueue` (idempotent by `commandId`), then phase 01 drains from `world.commandQueue` every entry with `tick <= ctx.tick`, in `(tick, actor, seq)` order, applying it and removing it. This keeps one authoritative source that saves preserve (TDS-18.2) while letting direct `step` callers inject commands.

### D3 — Scheduling and ordering

`submitCommand` schedules at `world.tick + 1` (protocol v1 has no `requested_tick`, TDS-16.1 step 5), assigns `nextSubmissionSeq` (monotonic), appends an `AcceptedCommandRecord` to `commandLog`, and inserts the `ScheduledCommand` into `world.commandQueue` sorted by `(tick, actor, seq)` with a total-order comparator. `revision` increases by `1` per accepted batch.

### D4 — Actor and revision checks

`SessionOptions` carries `actor: OwnerHandle` and `actorId: string` (single-player). `submitCommand` rejects `actor_id !== settings.actorId` with `not_owner`. Entity-scoped revision (A5): for each entity referenced by the command, read `world.stores.get('revision').get(entity)` as `{ revision?: number }`; reject with `state_revision_mismatch` (`expected`, `actual`) when any revision exceeds `expected_session_revision`. A command without the field is not revision-checked. `unknown_entity` is decided by a helper that checks whether any component store holds the entity.

### D5 — Phase-01 application semantics

- `SetEntityEnabled`: `unknown_entity` if absent; otherwise set the `enabled` store to `{ enabled }` (the shape `preconditions.ts` already reads).
- `SelectRecipe`: `unknown_entity` if no producer; `invalid_recipe` unless `recipe` is `null` or one of `producer.recipes`; otherwise set `recipe`, reset `progress` to `0`, `state` to `'idle'`, and `blockReasons` to `[]`.
- `SetProcessPriority`: `unknown_entity` if no producer; otherwise set the optional `Producer.processPriority` field.
- `SetCapabilityPriority`: `unknown_capability` unless the entity has a `capabilityConsumer` for the capability; otherwise set its `priority`.
- Any other `Command` type: reject with `not_supported` (defensive; the union has only the four).

`Producer` gains an optional `processPriority?: Int`. Because the canonical encoder rejects `undefined` values, the field is added only when a command sets it, so existing fixtures and the M1 goldens are unchanged.

### D6 — Error codes

`packages/core/src/errors/codes.ts` exports `ERROR_CODES`, a frozen record mapping each code to `{ arguments: readonly string[] }`. Codes: `state_revision_mismatch` (`expected`, `actual`), `unknown_entity` (`entity`), `not_owner` (`actor`), `invalid_recipe` (`entity`, `recipe`), `unknown_capability` (`entity`, `capability`), `unknown_command` (`type`), `not_supported` (`type`).

### D7 — Events and outcomes

Phase 01 emits `CommandApplied` (`{ command_id, type }`) and `CommandRejected` (`{ command_id, code, arguments }`) domain events with the command's entities as `subjects`. `TickOutput.outcomes` carries one `CommandOutcome` per due command. The app converts handles to string IDs only when it builds DTOs (a later row).

## Amendments and clarifications to 01–07

- None. `requested_tick` is absent from protocol v1 by design; TDS-16.1 step 5 then schedules at `world.tick + 1`.

## Risks / Trade-offs

- [Entity existence has no single registry] → D4's helper scans the component stores; a future `definition` component (already in the catalogue) can replace it without changing behaviour.
- [Producer shape change] → the optional field is added only when set, so hashes and goldens are unchanged until a `SetProcessPriority` command runs.

## Migration Plan

Additive core and app modules. No goldens change. Rollback is reverting the change.

## Open Questions

None blocking.
