# Design — add-placement-query-host

## Context

See proposal.md — Why. The application layer already owns the authoritative placement evaluation: `placementQuery(content, world, revision, dto)` in `packages/app/src/session/placement.ts` returns a `PlacementResultDto` and never mutates the world. `PlacementQueryDto`, `PlacementTransformDto`, and `PlacementResultDto` are already in `@aesfw/protocol` (PIC-12.1). The web host `answerQuery` in `packages/host-web/src/worker/session-host.ts` dispatches on `query['kind']` and already reads the live `session` and compiled `content` from its closure; it handles `entity_detail`, `need_breakdown`, `location_summary`, and `definition_metadata`, and returns `{}` for anything else. The wire query payload is a generic `JsonObject` (`WorkerQueryRequestDto.query`), and the response is a generic `JsonObject` (`WorkerQueryResultResponseDto.result`), so the branch can be added without touching any DTO. This document records the parsing and dispatch decisions only; no kernel, protocol, or app change is involved.

## Goals / Non-Goals

**Goals:** a `placement_query` branch in `answerQuery` that parses a `PlacementQueryDto` from the payload, calls the app-layer `placementQuery`, and returns `{ placement_result }`; malformed payloads return `{}`; L1 host tests for the valid, rejected, and malformed cases.

**Non-Goals:** the client placement UI, palette, ghost rendering, keyboard placement, and construction commands (3.8 `add-client-placement-mode`); the core predicates and app command mapping (3.3, done); any new DTO, `PROTOCOL_VERSION` bump, save-format change, or golden change.

## Decisions

### D1 — A new `placement_query` branch in `answerQuery`

`answerQuery` gains a branch after `definition_metadata`: when `kind === 'placement_query'`, parse the payload and call `placementQuery(content, session.world, session.revision, dto)`, returning `{ placement_result: result as unknown as JsonValue }`. The cast mirrors the existing branches, which cast their read-model objects into `JsonValue` because the result is a generic `JsonObject`. `placementQuery` is imported from `@aesfw/app` (already a dependency of `@aesfw/host-web`), next to the existing `entityDetail`/`needBreakdown`/`locationSummary`/`definitionMetadata` imports. Alternatives rejected: adding a dedicated worker DTO (unnecessary — the query payload and result are generic `JsonObject` and the change is explicitly scoped to no DTO change), and routing placement through `@aesfw/core` directly (the app layer is the composition boundary that resolves compiled content and builds the condition evaluator).

### D2 — Strict payload parsing; malformed payloads return `{}`

The branch validates the payload before calling the app layer: `definition_id` must be a string, `location_id` must be a safe integer, and `logical_transform` must be an object whose `position` is a two-element array of safe integers and whose `orientation` is a safe integer. If any check fails the branch returns `{}`, exactly as the other branches treat a missing or mistyped field, and consistent with the existing "unknown `kind` SHALL post an empty object" behavior. This keeps a malformed client payload from throwing inside the worker message loop, where an exception would escape `handle`. Alternatives rejected: letting `placementQuery` throw on a malformed payload (a bad client payload is an expected condition, not an `InvariantViolation`), and returning a diagnostic (no diagnostic code is introduced by this change; PIC-12.1 reports placement failures as `reasons`, not protocol errors).

### D3 — No revision or state side effects

The branch reads `session.revision` for the result's `revision` field and `session.world` for evaluation, and never assigns `session`. The `query` case in `handle` already posts the response without touching state; the placement branch keeps that property. `placementQuery` is pure over the world and content, so the branch introduces no clock, RNG, I/O, or module-level mutable state; the host remains the only place with side effects (message posting).

### D4 — Tests build compiled content in-process

The host test constructs a `CompiledContent` whose registry resolves a theme-free `test.entity.builder` definition (a `placement` component with a `1` by `1` footprint), a `test.condition.place_ok` condition, and a `test.resource.build` resource, mirroring `packages/app/src/session/placement.test.ts`. The `prepare` seam adds an active `4` by `4` grid location with blocked cell `(0, 0)` and a suitability property. Tests send the `query` message over the fake port and assert on the posted `query_result`. This exercises the branch through the same host message loop a client uses, without a browser.

## Risks / Trade-offs

- [The branch duplicates payload-shape knowledge that also lives in the app DTO] → the parsing is a few field guards over the generic `JsonObject`; a malformed payload yields `{}` rather than an exception, which is the host's established contract for queries.
- [A client could treat `placement_result.valid` as a substitute for the authoritative command outcome] → `placementQuery` is read-only and the result carries the revision; confirmation still runs through `PlaceEntityPlan`/`CommitConstruction` (PIC-12.1), and this change adds no command path.
- [The result object is cast to `JsonValue`] → consistent with every existing query branch; `PlacementResultDto` is plain JSON data, so the cast is sound.

## Migration Plan

Additive host behavior only. No save-format, protocol-version, or golden artifact changes. Rollback reverts the branch and its tests; clients that never send `placement_query` are unaffected.

## Amendments and clarifications to 01–07

- None. PIC-12.1 and TDS-21.1 already require the web host to answer a placement query through `query_result`; this change implements the existing contract rather than amending it.

## Open Questions

None blocking.
