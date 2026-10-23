# host/web Specification

## Purpose

The worker session host and the main-thread session client (TDS-21.1).

## Requirements

### Requirement: Session host initialization
`createSessionHost(options)` SHALL accept an injected `MessagePort`, a compiled-content loader, a clock (`now` and `setTimer`), a save-storage interface, the actor and tick duration, and a catch-up limit. On an `init` request it SHALL load the content, create a session, instantiate the content's entities, and post a `ready` response carrying the session id, tick, revision, and configuration checksum. An `init` request with a `save_slot` SHALL load that save instead.

Source: TDS-21.1, TDS-18.1

#### Scenario: Init yields a ready message
- **WHEN** the host receives `{ kind: 'init', protocol_version: 1 }` and the loader returns compiled content
- **THEN** it posts a `ready` response with the session id and tick `0`

### Requirement: Subscription and snapshots
On a `subscribe` request the host SHALL post a full `snapshot` response for the requested actor, and SHALL thereafter publish coalesced `delta` responses as ticks advance. A `command` request SHALL post a `command_result`. A `query` request SHALL post a `query_result` whose `result` is the read model named by the query's `kind`: `entity_detail` (an `EntityDetailDto`), `need_breakdown` (a `NeedBreakdownDto[]`), `location_summary` (a `LocationSummaryDto`), or `definition_metadata` (a `DefinitionMetadataDto[]`); an unknown `kind` SHALL post an empty object.

Source: TDS-21.1, PIC-10

#### Scenario: Subscribe yields a snapshot
- **WHEN** the host receives `{ kind: 'subscribe', protocol_version: 1, actor_id: 'test.owner.1' }`
- **THEN** it posts a `snapshot` response

#### Scenario: A command yields a result
- **WHEN** the host receives a `command` request
- **THEN** it posts a `command_result` response

#### Scenario: An entity-detail query yields a read model
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'entity_detail', entity_id: 3 } }`
- **THEN** it posts a `query_result` whose `result.entity_detail` carries entity `3`

### Requirement: Clock control and coalescing
The host SHALL own the only clock. A `control` request with action `run` SHALL start advancing ticks on the injected timer at the configured speed, `pause` SHALL stop, `speed` SHALL set the ticks per tick duration, and `step` SHALL advance the requested number of ticks immediately. Each wake SHALL advance at most `max_catch_up_ticks` ticks (default `8`) and SHALL post a single `delta` response covering all ticks since the last publication, carrying every event since then.

Source: TDS-21.1

#### Scenario: Stepping advances the tick and posts one delta
- **WHEN** a subscribed host receives `{ kind: 'control', action: 'step', ticks: 3 }`
- **THEN** the world tick is `3` and one `delta` response is posted

#### Scenario: Catch-up is limited
- **WHEN** a wake is due many ticks and `max_catch_up_ticks` is `8`
- **THEN** at most `8` ticks advance in that wake

### Requirement: Saves and loads
A `save` request SHALL persist the session to the named slot through the injected storage and post a `saved` response; a `load` request SHALL replace the session from the named slot and post a `loaded` response followed by a fresh snapshot.

Source: TDS-21.1, TDS-19.1

#### Scenario: A save round-trips through storage
- **WHEN** a subscribed host saves to slot `auto` and then loads slot `auto`
- **THEN** it posts `saved` then `loaded` and the reloaded tick equals the saved tick

### Requirement: Error boundary
When advancing throws an `InvariantViolation`, the host SHALL stop the clock and post an `error` response carrying the violation code, its arguments, and the last good state hash. It SHALL keep the session inspectable.

Source: TDS-21.1, TDS-23

#### Scenario: A violation stops the clock
- **WHEN** a tick throws an `InvariantViolation`
- **THEN** the host posts an `error` response and does not advance further

### Requirement: Session client
`createSessionClient(port)` SHALL return a proxy that depends only on `@aesfw/protocol` and exposes `init`, `subscribe`, `command`, `control`, `query`, `save`, and `load`, sending the matching request messages with `protocol_version` `1`, and an `onMessage` hook that delivers decoded responses.

Source: TDS-21.1, TDS-4.2

#### Scenario: The client sends a command message
- **WHEN** `client.command(envelope)` is called
- **THEN** the port receives a `command` request carrying the envelope and `protocol_version` `1`

### Requirement: Placement query through the web host

The worker session host SHALL answer a `query` request whose `kind` is `placement_query` by parsing `definition_id`, `location_id`, and `logical_transform` into a `PlacementQueryDto`, evaluating the application-layer `placementQuery` against the current session world and revision, and posting a `query_result` whose `result.placement_result` is the resulting `PlacementResultDto`. The query SHALL NOT mutate authoritative state.

Source: PIC-12.1, TDS-21.1

#### Scenario: A valid placement query returns a valid result
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'placement_query', definition_id: 'test.entity.builder', location_id: 1, logical_transform: { position: [1, 1], orientation: 0 } } }` and the world holds an active `4` by `4` grid location with a free cell at `(1, 1)`
- **THEN** it posts a `query_result` whose `result.placement_result.valid` is `true` and whose `reasons` are empty

#### Scenario: A rejected placement query returns its reasons
- **WHEN** the host receives the same `placement_query` with `logical_transform.position` `[0, 0]` at a location whose cell `(0, 0)` is blocked
- **THEN** it posts a `query_result` whose `result.placement_result.valid` is `false` and whose `reasons[0].code` is `not_buildable`

### Requirement: Malformed placement query

A `placement_query` payload missing any required field, or carrying a non-integer `location_id` or malformed `logical_transform`, SHALL post a `query_result` with an empty `result`, consistent with an unknown `kind`.

Source: PIC-12.1, TDS-21.1

#### Scenario: A malformed placement query returns an empty result
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'placement_query', location_id: 1 } }` with no `definition_id` or `logical_transform`
- **THEN** it posts a `query_result` whose `result` is `{}`

### Requirement: Planning query through the web host
The worker session host SHALL answer a `query` request whose `kind` is `planning` by evaluating the application-layer `planningMetrics` for the session's actor and posting a `query_result` whose `result.planning` is the `PlanningDto`. The query SHALL NOT mutate authoritative state. A malformed `planning` query SHALL post an empty `result`, consistent with an unknown `kind`.

Source: PIC-10.5, TDS-21.1

#### Scenario: A planning query returns the read model
- **WHEN** the host receives `{ kind: 'query', protocol_version: 1, actor_id: 'test.owner.1', query: { kind: 'planning' } }` for a session with an actor
- **THEN** it posts a `query_result` whose `result.planning.owner_id` is the actor's owner id

#### Scenario: A planning query in a session-less worker returns empty
- **WHEN** the host receives a `planning` query before `init`
- **THEN** it posts a `query_result` whose `result` is `{}`
