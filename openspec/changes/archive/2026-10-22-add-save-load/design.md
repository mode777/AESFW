# Design — add-save-load

## Context

`add-session-and-command-gateway` (2.2) is archived: `SessionState`, `createSession`, `submitCommand`, and `advance` exist. Core provides `encodeWorld`/`decodeWorld`/`hashWorld` (TDS-8.5). TDS-19.1 defines the save document. This document records only decisions those sections leave open.

## Goals / Non-Goals

**Goals:** the `SaveDocument`, `save`, `load`, and the `content_mismatch` diagnostic.

**Non-Goals:** migrations and ID aliases (12.1); replay documents (12.2); the IndexedDB store (2.6).

## Decisions

### D1 — Module layout

`packages/app/src/persistence/` holds `types.ts` (`SaveDocument`, `SaveHeader`), `save.ts`, `load.ts`, and `index.ts`, exported from `@aesfw/app`.

### D2 — Save document shape

`SaveDocument.header` follows TDS-19.1 exactly. `framework_version` is the app package version constant `0.1.0`; `schema_version` is the core `WORLD_FORMAT_VERSION`; `packages` is `content.packages` mapped to `{ id, version }`; `state_hash` is `hashWorld(session.world, registry)`. `state` is `encodeWorld(session.world, registry)`. `session` is `{ revision, next_submission_seq, command_log_tail: session.commandLog, settings: session.settings }`. The `settings` field is additive to TDS-19.1 so `load(content, doc)` can restore a usable session without a separate options argument; it is a minor save-format change within `format_version` `1`.

### D3 — Load

`load(content, doc)` first compares `doc.header.configuration_checksum` with `content.checksum` and the document's packages with `content.packages`; any difference returns `err([contentMismatch(...)])` with a `content_mismatch` diagnostic. It then calls `decodeWorld(content.registry, doc.state)`; decode errors are returned unchanged. On success it returns a `SessionState` with the decoded world, the document's `revision`, `next_submission_seq`, `command_log_tail`, and `settings`, and the passed `content`.

### D4 — Canonical form

The save document is canonical JSON data (TDS-19.3). `save` does not serialize to a string; hosts serialize with `det.canonicalStringify` when they persist it, so byte stability is a host concern (2.6).

## Amendments and clarifications to 01–07

- The `session.settings` field is added to the TDS-19.1 save document (additive). Recorded here as a clarification, not a normative amendment to 02–04.

## Risks / Trade-offs

- [Settings in the save] → keeps `load(content, doc)` self-contained; migrations (12.1) can relocate it if needed.
- [No package migration] → a mismatch fails closed with `content_mismatch` until 12.1.

## Migration Plan

Additive app modules. No goldens change. Rollback is reverting the change.

## Open Questions

None blocking.
