# Proposal

## Why

Roadmap 08, M7 item 7.5 (`add-unlocks`). GDD-19's unlock framework — progression earned by sustaining population rather than by a research currency — does not exist: phase 25 is a registered no-op, no content collection defines unlocks, and every definition is available from tick zero. This change adds unlock definitions and scopes, per-owner unlock state (phase 25), definition and command availability, and PIC-4 metadata exposure, retiring the progression-gating part of R-08.

## What Changes

- New `unlocks` content collection (CONT-6.17, `unlock` definition type): `{ id, scope: owner | global, reversible?, targets: [{ type, id }], condition }` with target types `entity_definition`, `recipe`, `population_tier`, `transport_type`, `location_template`, `connection`, `transition`, `exchange`.
- `@aesfw/content` builds an unlock system: it compiles each unlock's condition, evaluates it per owner (owner scope) or once (global scope), and writes the exposed target IDs into the owners' existing `unlocks` field, sorted and deduplicated. Reversible unlocks are revoked when their condition stops holding and no other satisfied unlock exposes the target; non-reversible unlocks persist.
- Phase 25 `evaluateUnlocks` runs the injected unlock system.
- Definition availability: phase 01 rejects `PlaceEntityPlan` for a gated definition the actor has not unlocked with `not_unlocked`.
- Sustained-condition timers gain the owner scope for unlock conditions (TDS-14.3 "owners for unlocks").
- PIC-4 definition metadata gains an optional `locked` field and accepts an availability predicate; the web host passes the session's unlock system.
- The owner-scoped `population_count` domain query is implemented for unlock conditions (cumulative population thresholds are the reference condition).

## Capabilities

### New Capabilities

- `sim/unlocks`: unlock definitions, scopes, evaluation, and definition availability.

### Modified Capabilities

- `content/schemas`: the `unlocks` collection and its reference checks.
- `content/conditions`: owner-scoped sustained timers.
- `app/protocol`: the additive `locked` metadata field.

## Impact

- **Packages:** `@aesfw/content` (unlock schema, system, owner query), `@aesfw/core` (phase 25, phase 01 gating, `UnlockSystem` injection), `@aesfw/app` (session wiring, metadata predicate), `@aesfw/protocol` (additive `locked`), `@aesfw/host-web` (metadata query), `fixtures/` (theme-free coverage).
- **Tick phases:** phase 25 `evaluateUnlocks` (reads/writes `owners`), phase 01 `applyCommands` (reads `owners` for gating), phase 22 `updateTimersAndBands` (owner timer scopes).
- **Store kinds:** `owners` (`unlocks`, already encoded and hashed). **Commands/events:** none new. **Error codes:** `not_unlocked` added to the registry. **Diagnostic codes:** `invalid_unlock_target`.
- **Protocol/save format:** additive optional `locked` metadata field; save format unchanged. **HASH-CHANGING:** no — no shipped fixture defines unlocks, so `owners.unlocks` stays empty and existing goldens are unchanged.
- **Dependencies on archived changes:** 7.1 `add-sustained-conditions` (archived 2026-10-23).

## Out of Scope

- 7.3 `add-tier-transitions`: transition command gating beyond definition availability.
- 8.x exploration/fog: knowledge-gated availability.
- 9.x exchanges: exchange target validation (no collection yet).
- Client rendering of locked definitions (7.9 owns the progression UI).
