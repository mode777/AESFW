# Proposal

## Why

Roadmap 08, M4 item 4.3 (`add-owner-deficit-policy`). With the balance currency (4.1) and maintenance (4.2) in place, a negative balance is currently inert: nothing pauses entities, so the self-correcting loss spiral of GDD-3.7/GDD-20.3 cannot happen and R-08's central failure-and-recovery loop is unplayable. This change adds phase 27, the `deficit_policy` content definition, and the manual resume command.

## What Changes

- `deficit_policy` content definition (CONT-6.22): `resource`, `trigger` comparison, `action: pause_entities`, `order`, `stop_when: net_rate_non_negative`, `exclude_tags`, and `resume` (`automatic_reverse_order`, `manual`, or `disabled`) with its own `when` comparison.
- Entity-definition `tags` (CONT-6.8): needed so `exclude_tags` can exempt archetypes (for example hubs) from pausing.
- Phase 27 `applyDeficitPolicy` (GDD-20.3, ARCH-5.2): when the trigger holds, entities of the owner are paused one at a time in the configured order (reference `maintenance_desc`, then `entity_id_asc`) until `net_rate_non_negative` holds; paused entities are written to the owner's `deficitPaused` state and report `paused_by_deficit`. Automatic resume restores them in reverse pause order when the resume condition holds.
- `ResumeDeficitPausedEntities` command (`entities` list or `all`) in the core union, phase 01, and the session mapper, for manual resume.
- Entity detail read model exposes `paused_by_deficit` and offers the resume command when the entity is paused (PIC-10.1).
- `checkInvariants` gains INV-23 (owner balance changes only through `account`/`trade` transactions) and keeps INV-11 (paused entities neither produce nor pay maintenance) exercised end to end.
- Registry gains an optional `handlesOf` enumeration so core can apply content-defined deficit policies without importing `@aesfw/content`.
- `demo-economy` gains a deficit policy so the spiral is observable end to end.

## Capabilities

### New Capabilities

### Modified Capabilities

- `sim/economy`: ADDED deficit-policy requirements — trigger, pause ordering, `net_rate_non_negative`, resume policies, `paused_by_deficit`, INV-11.
- `content/schemas`: ADDED the `deficit_policy` schema and entity `tags`.
- `content/registry`: ADDED requirement — the optional `handlesOf` enumeration accessor.
- `app/session`: ADDED requirement — `ResumeDeficitPausedEntities` mapping and scheduling.
- `app/projections`: MODIFIED — entity detail exposes `paused_by_deficit`.
- `testkit/harness`: MODIFIED — INV-23 is added to `checkInvariants`.

## Impact

- **Packages:** `@aesfw/core` (`sim/economy/deficit.ts`, phase 27, command union, phase-01 case, `Registry.handlesOf`), `@aesfw/content` (deficit-policy schema/collection/reference resolution, entity tags, `handlesOf` implementation), `@aesfw/app` (session mapping, entity detail), `@aesfw/testkit` (INV-23), `fixtures/` (demo-economy deficit policy).
- **Tick phases:** phase 27 `applyDeficitPolicy` (02 §5.2) — reads owner, maintenance, definition, residence, populationGroup, satisfaction, enabled, lifecycle, producer; writes `owners` (`deficitPaused`).
- **Store kinds:** `owners.deficitPaused` (authoritative, already encoded/hashed); no new store kinds.
- **Commands:** `ResumeDeficitPausedEntities`. **Events:** `DeficitPaused`, `DeficitResumed`. **Error codes:** none new (`unknown_entity` reused). **Diagnostic codes:** `duplicate_deficit_policy`.
- **Protocol/save format:** none — commands are string-typed envelopes; `EntityDetailDto.paused_by_deficit` already exists. **HASH-CHANGING:** phase 27 writes `deficitPaused`, so worlds whose owners run a deficit change; the `demo-basic-loop` golden has no deficit policy and no maintenance, so it is unaffected. Any golden change is explained in design.md (06 §9.4).
- **Dependencies on archived changes:** 4.2 `add-maintenance` (archived 2026-10-22), 4.1 `add-balance-resources-and-income` (archived 2026-10-22), 2.2 `add-session-and-command-gateway` (archived 2026-10-22).

## Out of Scope

- 4.4 `add-owner-economy-read-model`: `OwnerBalanceDto` revenue/expense/pause-order read model.
- 4.6 `add-golden-loss-spiral`: the SCN-04 scenario and its golden.
- 7.3 `add-tier-transitions`: the `trigger_transition` maintenance shortage policy remains rejected until transitions exist.
- 13.4 `add-multiple-owners`: per-actor deficit policy selection; this change applies every compiled policy to every owner.
- `stop_when` values other than `net_rate_non_negative`.
