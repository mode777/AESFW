# Design — add-protocol-dtos

## Context

`add-purity-and-boundary-guardrails` (0.2) is archived: `@aesfw/protocol` exists as a zero-dependency package stub, dependency-cruiser forbids it from importing any other package (TDS-4.3 rule 3), and the ambient-API traps run in its tests. TDS-22 fixes the protocol's contents and conventions; 04 fixes the wire shapes. This document records only decisions not already fixed by 05.

## Goals / Non-Goals

**Goals:** the versioned DTO types of 04 and pure boundary codecs returning `Result`-style outcomes, with zero runtime dependencies.

**Non-Goals:** projection builders, session, gateway, read-model computation, save/load, worker host (2.2–2.6); placement DTOs and other read models (3.3, 4.4/4.5); fog filtering (8.4).

## Decisions

### D1 — Module layout

`packages/protocol/src/` holds `version.ts`, `result.ts`, `errors.ts`, `scalars.ts`, `commands.ts`, `snapshot.ts`, `events.ts`, `metadata.ts`, `readmodels.ts`, `worker.ts`, `codecs/` (one module per DTO family plus `guards.ts`), and `index.ts`. The package root re-exports all types and codecs.

### D2 — Local `Result` and error type (no cross-package import)

TDS-22 says codecs return `Result`s, but protocol MUST NOT import `@aesfw/core` (TDS-4.3 rule 3), where `Result` lives. Protocol therefore declares its own structurally identical `DecodeResult<T>` and a `ProtocolError` record (`code`, `path`, `arguments`). No runtime dependency is added.

### D3 — DTO fidelity and forward compatibility

Every DTO field is named exactly as 04 writes it (`snake_case`). Sub-DTOs owned by later milestones (production, spatial, capability, maintenance, residence, transition) are typed but optional on the parent DTOs, so v1 accepts snapshots that omit fields a later row fills in. Additive fields are a minor protocol change (TDS-22); this change establishes v1.

### D4 — Decode strategy

Codecs are hand-written structural validators (no schema library, to keep zero dependencies). `guards.ts` provides `isObject`, `isInteger`, `isString`, `isStringArray`, and an error collector. Each decode function walks its DTO, collecting `protocol.invalid_field` errors with a JSON-pointer `path` and returns `ok` only when the list is empty. Unknown extra keys are ignored, so additive fields remain compatible. `decodeWorkerRequest`/`decodeWorkerResponse` first check `protocol_version` (integer; `1` accepted, other integers → `protocol.version_mismatch`, non-integer/missing → `protocol.invalid_field`), then dispatch on `kind` (unknown → `protocol.unknown_kind`).

### D5 — Worker message kinds

Request kinds: `init`, `subscribe`, `command`, `control`, `query`, `save`, `load`. Response kinds: `ready`, `snapshot`, `delta`, `command_result`, `query_result`, `saved`, `loaded`, `error`. These are exactly the arrows of TDS-21.1 and are the set the host (2.6) implements.

### D6 — Integers only on the wire

Guards accept only safe integers for numeric fields (`Number.isSafeInteger`). Floating point never decodes, reinforcing TDS-22's base-unit-integer rule at the boundary.

## Amendments and clarifications to 01–07

- None. 04 and TDS-22 already define the contract; this change implements it.

## Risks / Trade-offs

- [Hand-written codecs can drift from 04] → each DTO family has a decode test using the 04 examples; the wire names are checked in tests.
- [Optional sub-DTOs may under-validate] → the fields M2 actually consumes (owners, locations, entities, command envelopes, results, events, metadata, M2 read models, worker messages) are validated; later rows tighten their own sub-DTOs when they consume them.

## Migration Plan

Additive: the protocol package gains modules. No goldens, saves, or protocol versions exist yet. Rollback is reverting the change.

## Open Questions

None blocking.
