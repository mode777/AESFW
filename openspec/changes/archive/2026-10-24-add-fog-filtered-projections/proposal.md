# Proposal

## Why

Roadmap 08, M8 item 8.4 (`add-fog-filtered-projections`). ARCH-8.3 and PIC-9.3 require that every projection, delta, read model, and event produced for an actor omit — not hide — the attributes of locations that actor does not know, and 8.2/8.3 made knowledge state live. Today the projection builder receives the actor but filters nothing: every location's full attributes, every entity, and every event cross the boundary regardless of knowledge, which is the fog-leak risk R-11. This change applies per-actor filtering at the application layer while building, adds the location-delta leg that makes newly visible attributes arrive, and retires R-11 with INV-19 unit coverage per read model and event type plus the P-09 property.

## What Changes

- The projection filters per actor: a location unknown to the actor carries only its ID, `knowledge: unknown`, and its connections; a discovered or established location carries everything. Entities at unknown locations are omitted. Fog is a session setting (`fog`, default enabled) so a configuration may disable it (GDD-16.1).
- Deltas gain additive `location_updates`: a location entry whose filtered DTO changed (the `unknown → discovered` transition) is re-sent whole in the next delta, satisfying PIC-9.3's follow-up rule.
- A new application-layer event filter exposes to an actor exactly the events that name that actor as owner, or that carry no owner and no unknown location.
- Read models filter per actor: entity detail, need breakdown, and transition eligibility return null for entities at locations unknown to the actor; the location summary of an unknown location carries only its ID and knowledge; planning metrics exclude producers at unknown locations. Transport detail and the order list already expose only entity and station IDs and stay unchanged.
- The web host passes the session actor to the read models that now take it and applies the event filter when publishing deltas.
- The snapshot location codec decodes the additive `knowledge` field (it silently dropped it before); the delta codec decodes `location_updates` and `applyDelta` merges them.

## Capabilities

### Modified Capabilities

- `app/projections`: per-actor fog filtering of the projection, delta, events, and read models; INV-19; P-09.

## Impact

- **Packages:** `@aesfw/app` (projection, delta, event filter, read models, `fog` setting), `@aesfw/protocol` (additive `location_updates`, `knowledge` decode), `@aesfw/host-web` (actor wiring, event filter at publish), `@aesfw/testkit` (none).
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error/diagnostic codes:** none new.
- **Protocol/save format:** additive optional `location_updates` on the delta DTO and `knowledge` on decoded location DTOs; no version bump. **HASH-CHANGING:** no — world state is untouched; all shipped scenarios run single-owner with full knowledge and their projections are unchanged.
- **Dependencies on archived changes:** 8.2 `add-knowledge-and-exploration` (archived 2026-10-23), 2.3 `add-projections-and-deltas` (archived 2026-10-22).

## Out of Scope

- 8.5 `add-golden-exploration`: the SCN-05 scenario golden.
- 8.6 `add-client-fog-and-expansion`: client rendering of fog and the explore/establish flows.
- 12.x: partitioned/area subscriptions and incremental snapshots beyond the whole-actor projection.
- Area-of-interest filtering by distance or region: only knowledge-state filtering is in scope.
