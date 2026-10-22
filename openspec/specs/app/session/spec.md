# app/session Specification

## Purpose

The pure application session: create a session from compiled content, accept and schedule commands through the gateway, advance the simulation, and apply the first command types in phase 01 (TDS-18.1–18.3, TDS-16).

## Requirements

### Requirement: Session creation
`createSession(content, options)` SHALL return `ok(SessionState)` with the given `sessionId`, the compiled `content`, a world created from `options.seed`, `options.tickDurationMs`, `options.world`, and `options.enabledModules`, `revision` `0`, `nextSubmissionSeq` `0`, an empty `commandLog` and `hashLog`, and the `settings` (`hashInterval`, `journal`, `actor`, `actorId`). It SHALL return `err(diagnostics)` if world creation fails and SHALL NOT read a clock, files, or randomness.

Source: TDS-18.1, TDS-18.2, TDS-10.1

#### Scenario: A session starts at revision 0
- **WHEN** `createSession(content, { sessionId: 'session.1', seed: [1, 2], tickDurationMs: 100, world: null, enabledModules: [], hashInterval: 0, journal: false, actor: 0, actorId: 'test.owner.1' })` is called
- **THEN** the result is ok, `revision` is `0`, `world.tick` is `0`, and `commandLog` is empty

### Requirement: Command submission and scheduling
`submitCommand(session, envelope)` SHALL decode the `CommandEnvelopeDto`, reject it when `actor_id` is not the session actor with `not_owner`, and otherwise schedule the command at `world.tick + 1` with the next submission sequence, append it to `commandLog` and to `world.commandQueue` (ordered by `(tick, actor, seq)`), increase `revision` by `1`, and return an accepted `CommandResultDto` carrying `scheduled_tick`.

Source: TDS-16.1, TDS-18.2, ARCH-7.3

#### Scenario: A valid command is accepted and scheduled
- **WHEN** a `SetEntityEnabled` envelope for the session actor is submitted at tick `0`
- **THEN** the result status is `accepted`, `scheduled_tick` is `1`, the session `revision` is `1`, and `world.commandQueue` has one entry

#### Scenario: A command from another actor is rejected
- **WHEN** an envelope with `actor_id` `test.owner.2` is submitted to a session whose actor is `test.owner.1`
- **THEN** the result status is `rejected` with error code `not_owner` and the world is unchanged

### Requirement: Gateway reference and revision checks
`submitCommand` SHALL reject a command that references an entity absent from the world with `unknown_entity`. When the envelope carries `expected_session_revision` `R`, it SHALL reject with `state_revision_mismatch` only when an entity referenced by the command has a `revision` component value greater than `R`. A rejected command SHALL NOT change the world, the command log, or the revision.

Source: TDS-18.3, ARCH-7.4, amendment A5

#### Scenario: A missing entity is rejected
- **WHEN** a `SelectRecipe` command references entity `999` on a world whose next entity id is `10`
- **THEN** the result is `rejected` with `unknown_entity`

#### Scenario: A stale expected revision is rejected
- **WHEN** an entity's `revision` component is `5` and a command referencing it carries `expected_session_revision` `3`
- **THEN** the result is `rejected` with `state_revision_mismatch` and the revision arguments are `expected: 3`, `actual: 5`

#### Scenario: A command without an expected revision is not revision-checked
- **WHEN** the same command omits `expected_session_revision`
- **THEN** it is accepted even though the referenced entity's revision is greater than `0`

### Requirement: Advance
`advance(session, ticks)` SHALL run exactly `ticks` ticks, passing each tick's due commands to `step`, increase `revision` by one per completed tick, append a hash checkpoint when `settings.hashInterval` divides the new tick, and return the session and the per-tick `TickOutput`s. `advance(session, 0)` SHALL return the session unchanged with no outputs.

Source: TDS-18.1, TDS-18.3, TDS-10.1

#### Scenario: Advancing a session runs ticks
- **WHEN** `advance(session, 3)` runs on a session at tick `0`
- **THEN** the returned session `world.tick` is `3`, `revision` is `3`, and there are three outputs

### Requirement: Phase 01 command application
Phase 01 `applyCommands` SHALL apply every due scheduled command in `(tick, actor, submission sequence)` order and emit one `CommandApplied` event per applied command and one `CommandRejected` event per rejected command, each carrying the command id and, for a rejection, the error code and arguments. It SHALL emit a `CommandOutcome` per due command. `SetEntityEnabled` SHALL set the entity's `enabled` component; `SelectRecipe` SHALL set the producer's recipe to the requested recipe or clear it, rejecting with `invalid_recipe` when the recipe is not one of the producer's recipes; `SetProcessPriority` SHALL set the producer's process priority; `SetCapabilityPriority` SHALL set the priority of the entity's capability consumer for the requested capability, rejecting with `unknown_capability` when there is none. A command whose entity is absent SHALL be rejected with `unknown_entity`, and a command type not implemented by this change SHALL be rejected with `not_supported`.

Source: TDS-16.1, TDS-16.2, ARCH-5.2, ARCH-7.2

#### Scenario: SetEntityEnabled disables an entity
- **WHEN** a `SetEntityEnabled` command with `enabled: false` for a producer is applied in phase 01
- **THEN** the entity's `enabled` component is `{ enabled: false }` and a `CommandApplied` event is emitted

#### Scenario: SelectRecipe with an unknown recipe is rejected
- **WHEN** a `SelectRecipe` command names a recipe that is not among the producer's recipes
- **THEN** a `CommandRejected` event with code `invalid_recipe` is emitted and the producer is unchanged

#### Scenario: A command for a missing entity is rejected at apply time
- **WHEN** a due `SetProcessPriority` command references an entity with no producer component
- **THEN** a `CommandRejected` event with code `unknown_entity` is emitted

### Requirement: Error-code registry
`@aesfw/core` SHALL export an error-code registry mapping each stable code to its argument names, including `state_revision_mismatch`, `unknown_entity`, `not_owner`, `invalid_recipe`, `unknown_capability`, `unknown_command`, and `not_supported`. Codes SHALL be unique and never reused for a different meaning.

Source: TDS-16.3

#### Scenario: The registry declares the revision-mismatch arguments
- **WHEN** the registry entry for `state_revision_mismatch` is read
- **THEN** its argument names are `expected` and `actual`
