# Design

## Context

9.1 delivered the authoritative price state; 9.2 made it move. PIC-10.7's read model is the last framework surface before the client view. The transport-detail read model (6.6) is the established shape: a pure function over `SessionState` returning a protocol DTO or null, routed by the worker host's `answerQuery`.

## Goals / Non-Goals

- Goals: the DTO, the read model with fog gating, host routing, codec.
- Non-Goals: client rendering (9.5), SCN-06 (9.4), subscriptions or delta pushes for quotes (12.x).

## Decisions

### D1 — One DTO per exchange entity, queried on demand

`exchangeQuotes(session, actor, exchange)` mirrors `transportDetail`. The drawer of 9.5 queries the selected exchange; no per-tick projection field is added, so deltas and snapshots stay unchanged and the quote validity revision is the session revision at query time. Region comes from the exchange location's `Location.region` resolved to its definition id (omitted when the location has none).

### D2 — Recovery estimate in ticks, informative only

Per direction: `ceil(|price − base| / recoveryStep) × recovery_interval_ticks`, floored at `0` when already at base, omitted when recovery is configured off (`recovery_permille_per_interval === 0`) or the estimate would overflow. It is a display value computed in the read model; nothing writes it back (04 §10.7's derived-values rule).

### D3 — Volume is the current in-window sum

`recent_sold`/`recent_bought` are `windowVolume` of the row's windows at the current tick — the same quantity the elasticity steps on, so the client's "recent volume" and the price movement always agree.

### D4 — Fog gate mirrors entity detail

The exchange entity's location is read from `exchangeRef.location` (9.1). With fog on, an actor that does not know that location gets `null` (8.4's location-bound read-model rule); with fog off, always resolvable.

## Clarifications recorded (no normative amendment)

- The quote validity revision is the session revision (D1) — quotes are point-in-time informative values, not versioned authority.
- Recovery estimate is omitted when recovery is disabled rather than reported as infinity (D2).

## Risks / Open Questions

- None known; the surface is additive and read-only.
