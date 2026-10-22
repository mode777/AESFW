# Spec Delta

## Purpose

The versioned save document and the pure save/load functions (ARCH-15, TDS-19.1, TDS-19.3).

## ADDED Requirements

### Requirement: Save document
`save(session)` SHALL return a `SaveDocument` with a `header` carrying `format` `'aesfw-save'`, `format_version` `1`, the framework version, the world schema version, the content packages (`id`, `version`), the configuration checksum, the session id, the tick, the tick duration, the seed, the hash algorithm `fnv1a64-canonical-json-v1`, and the state hash; a `state` equal to `encodeWorld(session.world, registry)`; and a `session` object carrying `revision`, `next_submission_seq`, the command log tail, and the session settings.

Source: TDS-19.1, TDS-19.3, ARCH-15.1, ARCH-15.2

#### Scenario: A save records the tick and checksum
- **WHEN** a session at tick `5` with checksum `abc` is saved
- **THEN** the document header's `tick` is `5` and `configuration_checksum` is `abc`

#### Scenario: A save carries the authoritative state
- **WHEN** a session is saved
- **THEN** the document's `state` equals `encodeWorld` of the session world

### Requirement: Load
`load(content, doc)` SHALL reject a document whose `configuration_checksum` differs from the content checksum, or whose package versions differ, with a `content_mismatch` error diagnostic. Otherwise it SHALL decode the state with `decodeWorld`, rebuild a `SessionState` with the document's `revision`, `next_submission_seq`, command log, and settings, and return it. A state that fails to decode SHALL return the decode diagnostics.

Source: TDS-19.1, ARCH-15.4

#### Scenario: A matching save loads
- **WHEN** a saved session is loaded against the same content
- **THEN** the loaded session's `world.tick` equals the saved tick and its `revision` equals the saved revision

#### Scenario: A mismatched checksum is rejected
- **WHEN** a document with `configuration_checksum` `abc` is loaded against content with checksum `def`
- **THEN** the result is an error whose first diagnostic code is `content_mismatch`

### Requirement: Save-continue determinism
Saving at a tick boundary, loading the document, and advancing to a later tick SHALL produce the same state hash as advancing an uninterrupted session to the same tick (SCN-13, basic content).

Source: TDS-19.1, VER-9.3, SCN-13

#### Scenario: A save-continue run matches an uninterrupted run
- **WHEN** a session is advanced `3` ticks, saved, loaded, and advanced `3` more ticks, and another session is advanced `6` ticks
- **THEN** both worlds hash identically
