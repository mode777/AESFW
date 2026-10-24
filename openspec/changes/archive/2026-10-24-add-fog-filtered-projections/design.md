# Design

## Context

The projection builder already receives the actor (2.3's per-actor design) and the reader already exposes `knowledge(actor, location)`. 8.2/8.3 made knowledge authoritative and movable. What is missing is entirely application-layer: gates at the DTO-building sites, an event filter, the location-delta leg, and the `fog` configuration switch (GDD-16.1).

## Goals / Non-Goals

- Goals: knowledge-state filtering of projections, deltas, events, and read models; INV-19 unit coverage; P-09 property.
- Non-Goals: area/distance subscriptions (12.x), client rendering (8.6), SCN-05 (8.5).

## Decisions

### D1 — Filter while building, keyed on the session's `fog` setting

`SessionSettings` gains `fog: boolean` (default `true`; `SessionOptions.fog?`). Every filter site checks `session.settings.fog === false` once and returns the unfiltered result when disabled (GDD-16.1's configuration switch). Filtering happens inside the DTO builders (`locationDto`, the entity map of `project`), never as a post-pass (ARCH-8.3, TDS-18.4).

### D2 — Unknown-location DTO shape

Per PIC-9.3: `{ entity_id, knowledge: 'unknown', inventories: [], connections, connection_details }`. Connections stay because they are the "known connections" the contract names (a unit of the actor can have traversed them); everything else is dropped. Discovered and established locations are unchanged.

### D3 — Location-level deltas

`SnapshotDeltaDto` gains additive `location_updates?: LocationDto[]`. `diffProjection` compares the filtered location DTOs of the two same-actor projections by canonical JSON and emits changed entries whole; `applyDelta` replaces them in the base snapshot. This satisfies PIC-9.3's follow-up rule with one mechanism instead of a special resync path, and it composes with the existing revision/resync rules.

### D4 — Event visibility rule

`visibleEvents(world, registry, actor, events)` (app, `projections/fog.ts`): an event is visible when `event.owner === actor`, or when `event.owner === null` and (`event.location === null` or the actor's knowledge of `event.location` is not `unknown`). `LocationDiscovered` carries the owner, so it is visible exactly to its owner. The host-web `publish()` applies the filter to `pendingEvents` before posting; raw `advance` outputs stay unfiltered (the framework boundary is the host, per TDS-17's owner/location fields).

### D5 — Read-model gates

`entityDetail`, `needBreakdown`, and `transitionEligibility` gain an `actor: OwnerHandle` parameter and return null/no rows for entities at locations unknown to the actor (fog on). `locationSummary` of an unknown location returns `{ entity_id, knowledge: 'unknown', active: false }` with all optional aggregates omitted (`active` is a required wire field; `false` is the non-committal value). `planningMetrics` filters producer rows by location knowledge. `transportDetail` and `transportOrders` stay unfiltered — they expose entity and station IDs only, which the contract already treats as visible. The host `answerQuery` passes `session.settings.actor` to the read models that now take it.

### D6 — Codec completeness

`decodeLocation` gains `knowledge` decoding (it silently dropped the field, which the client needs for 8.6); the delta codec decodes `location_updates`, and `applyDelta` merges them. Additive, no version bump (precedent: `delta.hash`).

### D7 — INV-19/P-09 coverage shape

Per VER's fog row: unit tests per read model (entity detail, need breakdown, location summary, planning, transition eligibility) and per event family (discovery, arrival, deficit, throttling, command outcomes) assert no unknown-location attributes leak for a fogged actor; the P-09 fast-check property generates multi-location worlds with mixed knowledge states and holds INV-19 over projection, delta, read models, and filtered events in one pass.

## Clarifications recorded (no normative amendment)

- `active: false` is the non-committal value for an unknown location's required `active` field (D5).
- Connections of an unknown location are "known connections" per PIC-9.3 and stay visible (D2).
- Raw `advance` outputs are unfiltered; the actor boundary is the host publish path (D4).
- The order list read model lists every order regardless of actor; orders are owner-scoped in v1 single-actor sessions (D5).

## Risks / Open Questions

- Location-level deltas re-send the whole location DTO when any attribute changes; at v1 sizes this is small. If it grows, 12.x can split the DTO.
- 13.4's multi-actor sessions will need per-actor subscriptions on the host; the filter here is the per-actor boundary they reuse.
