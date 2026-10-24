# Design

## Context

All state exists: `OwnerState.knowledge` (sorted, saved, hashed), the `KnowledgeLevel` order, `WorldReader.knowledge`, the world-plan seeding from `established_locations`/`known_locations`, and phase 16's arrival scratch record (`TransportArrival { unit, location }`, ascending unit order, written before phase 18 runs). The transport order systems gate every behavior on `order.mode !== 'route'`, so `explore` orders are inert today. The event DTO carries `owner` and `location` fields exactly for per-actor filtering (TDS-17), which 8.4 will use.

## Goals / Non-Goals

- Goals: phase 18 discovery, `LocationDiscovered`, executable explore orders, INV-14 in the harness.
- Non-Goals: establish mode (8.3), fog filtering (8.4), client flows (8.6), condition-driven reveals (unowned; the `knowledge_state` query stays a registered name).

## Decisions

### D1 — Phase 18 reads the arrival scratch record

`phase-18-resolve-arrivals.ts` declares `reads: []` (the scratch record crosses phases without a store read) and `writes: ['owners']`. It iterates `readTransportArrivals(scratch)` in list order (phase 16 already produces ascending unit order). The unit's owner comes from the unit's `owner` component; an arrival without an owner component is skipped (unowned units discover nothing). The new level is `max(current, 'discovered')` with the order `unknown < discovered < established`; `established` is never written down. Only the `unknown → discovered` transition emits `LocationDiscovered` with `subjects: [location]`, `owner`, `location`, and payload `{ owner, location }` — matching `TransportArrived`'s payload shape and giving 8.4 the fields it filters on.

### D2 — Explore mode rides the route machinery

`planTransportOrders` and `advanceTransportOrders` widen their gate to `mode === 'route' || mode === 'explore'`. Explore stations carry `actions: []`, so `currentAction` returns `null`, arrival advances the station cursor, and no handling is requested; `collectTransportHandlingRequests` stays route-only (an explore order has no action to handle). Repeat and `shortest_stable` behave exactly as for route orders. `trade` (9.2) and `establish` (8.3) stay dormant behind the existing gate; their behavior is owned by their rows.

### D3 — INV-14 in the harness

`checkInvariants` gains a knowledge check comparing the before and after worlds per owner: level order `unknown(0) < discovered(1) < established(2)`, `after >= before` per location, entries sorted by ascending location ID, no duplicate locations. A violation reports `INV-14` with the owner handle and location entity in the message. The check runs for every tick of every integration, property, and scenario test that uses the harness, at the cost of one array comparison per owner.

## Clarifications recorded (no normative amendment)

- Only the first `unknown → discovered` transition emits `LocationDiscovered`; later arrivals are silent (D1).
- Unowned units (no `owner` component) discover nothing (D1).

## Risks / Open Questions

- Reveal-by-condition (GDD-16.1) has no owning row yet; the registered `knowledge_state` query name remains unevaluated. Recorded here so M10's diagnostic sweep or a later gap-closure change can claim it.
- Phase 16's arrival list is consumed, not cleared; phase 18 runs after phase 16 in the same tick, so ordering is safe today. If a later row reorders phases 16–19, the scratch contract must be revisited.
