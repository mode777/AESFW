# Spec Delta

## Purpose

The worker session host and the main-thread session client (TDS-21.1).

## ADDED Requirements

### Requirement: Session host initialization
`createSessionHost(options)` SHALL accept an injected `MessagePort`, a compiled-content loader, a clock (`now` and `setTimer`), a save-storage interface, the actor and tick duration, and a catch-up limit. On an `init` request it SHALL load the content, create a session, instantiate the content's entities, and post a `ready` response carrying the session id, tick, revision, and configuration checksum. An `init` request with a `save_slot` SHALL load that save instead.

Source: TDS-21.1, TDS-18.1

#### Scenario: Init yields a ready message
- **WHEN** the host receives `{ kind: 'init', protocol_version: 1 }` and the loader returns compiled content
- **THEN** it posts a `ready` response with the session id and tick `0`

### Requirement: Subscription and snapshots
On a `subscribe` request the host SHALL post a full `snapshot` response for the requested actor, and SHALL thereafter publish coalesced `delta` responses as ticks advance. A `command` request SHALL post a `command_result`; a `query` request SHALL post a `query_result`.

Source: TDS-21.1, PIC-9

#### Scenario: Subscribe yields a snapshot
- **WHEN** the host receives `{ kind: 'subscribe', protocol_version: 1, actor_id: 'test.owner.1' }`
- **THEN** it posts a `snapshot` response

#### Scenario: A command yields a result
- **WHEN** the host receives a `command` request
- **THEN** it posts a `command_result` response

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
