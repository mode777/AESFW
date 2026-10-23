# Design

## Context

`OwnerState.unlocks` exists as authoritative saved state but is never written; phase 25 is a no-op. Core cannot interpret compiled conditions, so the 1.6/7.1 precedent applies: content builds an injected implementation carried on `TickInput`/`TickContext` (design D4). The web host already builds definition metadata and has the session and actor.

## Goals / Non-Goals

- Goals: unlock content, per-owner evaluation, availability gating, owner-scoped sustained timers, metadata exposure.
- Non-Goals: transitions (7.3), fog/knowledge gating (8.x), exchange targets (9.x), client UI (7.9).

## Decisions

### D1 — Content shapes and validation

`unlocks` maps to the existing `unlock` definition type, placed after `satisfaction_bands`. Target types map to core `DefinitionType`s; `transition` and `exchange` resolve when their collections exist (7.3, 9.1), so their IDs are not reference-checked yet. `condition` must resolve. The unlock's `condition` is a condition definition ID (CONT-6.17), not an inline expression.

### D2 — Unlock system (content)

`buildUnlockSystem(content)` compiles every unlock condition once and precomputes the gated `(type|id)` set. `update(ctx)` evaluates per owner in ascending handle order: owner-scoped unlocks use the owner as subject, global unlocks are evaluated once (subject `global`, query `0`) and expose to every owner. `reversible` unlocks recompute their targets from scratch (a target survives while any satisfied unlock exposes it); non-reversible unlocks union with existing state. The written list is sorted by string ID (total order). No new store kind: the existing `owners.unlocks` field is used, so existing goldens are unchanged.

### D3 — Owner-scoped sustained timers

`buildSustainedTimerUpdater` gains an optional owner query resolver and treats conditions referenced by unlock definitions as owner-scoped: it writes timer rows with subject `entityId(owner.handle)` for every owner, alongside the existing source-entity scope. The final table is re-sorted by `(condition, slot, subject)` as before. The unlock evaluator reads the same key. Using the owner handle as the timer subject is the v1 key for owners (documented clarification; owner handles and entity IDs share the numeric space but never collide semantically in the timer table because the condition's scope determines the interpretation).

### D4 — Availability and gating

`UnlockSystem.isAvailable(world, owner, type, id)` returns true for untargeted definitions and otherwise checks the owner's `unlocks`. Phase 01 checks it before applying `PlaceEntityPlan` and rejects `not_unlocked`. `not_unlocked` joins the error-code registry.

### D5 — Metadata exposure

`DefinitionMetadataDto` gains an additive optional `locked?: boolean`; the codec decodes it when present. `definitionMetadata(content, type, isAvailable?)` sets `locked: true` for unavailable definitions. The web host builds the unlock system per metadata query and passes the session actor. This is an additive protocol field (no version bump), consistent with earlier additive fields (`init.content`, `delta.hash`).

### D6 — Owner population query

`unlockQueryValue(registry, world, owner, query)` implements `population_count` for owner scope: it sums `populationGroup.count` over residences whose `owner` component or location owner matches, optionally filtered by tier. Other queries return `0` in v1. This is the reference unlock condition (GDD-19).

## Clarifications recorded (no normative amendment)

- Timer subjects for owner scopes are the owner handle encoded as an entity ID (D3); the timer table stays `(condition, slot, subject)`.
- `global` scope exposes targets to every owner in v1 single-owner worlds (D2).

## Risks / Open Questions

- Unlock evaluation runs per owner per tick over all unlocks; with v1 content sizes this is small and revisited in the M7 benchmark note.
