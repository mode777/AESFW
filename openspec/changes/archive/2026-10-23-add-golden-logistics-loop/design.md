# Design

## Context

6.7 is the M6 acceptance scenario. The scenario format already carried `commands`, but the runner ignored them. A route order cannot be created by content alone, so this change makes the runner honour the format.

## Decisions

### D1 — The runner uses the application session

`runScenario` creates a session with `createSession`, instantiates the selected world with `instantiateWorldContent`, and calls `advance(session, 1)` per tick. At the start of each tick it submits every scenario command with `tick === currentTick` through `submitCommand`. The command gateway schedules the command for the next tick, which is the tick being advanced, so the command applies in phase 01.

The session's `actorId` is the first command's actor, or `owner.0` when there are no commands. Multi-actor scenarios remain out of scope; a command from another actor is rejected and reported as `command_rejected`.

### D2 — Existing scenarios stay byte-identical

Scenarios without commands take the same path: create session, instantiate, advance with the same hash interval. The session uses the same `step`, condition evaluator, journal flag, and hash options as the previous runner. `pnpm verify` confirms the existing goldens are unchanged.

### D3 — Fixture entity ids are intentional

The scenario assigns order `9` to unit `8`. The fixture fixes the instantiation order: locations `1` and `3`, inventories `2` and `4`, source `5`, producer `6`, residence `7`, transport `8`; the created order is `9`. This is a fixture, not a framework rule; a future command that creates and assigns atomically would remove the coupling.

### D4 — The loop is closed at both ends

The source at location A deposits raw into A's shared inventory. The transport loads raw at A and unloads it at B. The producer at B consumes raw into goods, and the residence at B consumes goods. The fixture therefore exercises load, travel, unload, production, and need fulfillment in one scenario.

## Phases and stores

No phase or store change. The fixture uses existing throughput, production, needs, and transport stores.

## Ordering and rounding

The scenario runner processes commands in declaration order and ticks in ascending order. Transport and production ordering is unchanged.

## Amendments

No amendment to 01–04 is required. The M11 note about scenario commands is partially retired: commands now run, but SCN-14's scripted strategy and `expect` evaluation remain M11 work.

## Risks

- The runner now depends on `@aesfw/app` in addition to core. Testkit already depended on app, so the package graph is unchanged.
- Hard-coded order and unit ids in the fixture will need updating if world instantiation order changes. The golden test would fail loudly, which is preferable to silent drift.
- The scenario command id is derived from `(scenario id, tick, type)`. Two commands of the same type on the same tick would collide; the fixture does not do this. A later row can add an index to the id.
