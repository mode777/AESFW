# Proposal

## Why

Roadmap 08, M6 item 6.3 (`add-route-planning-and-movement`). Transport units exist after 6.2 but cannot move: there is no stable route planner, no traversal-time rule, and phase 16 is a no-op. This change implements ARCH-14.1–14.3 so a unit can follow a planned path between connected locations and arrive deterministically.

## What Changes

- Add `planRoute(world, from, to, speedPermille, allowedTags)` implementing `shortest_stable`: minimize total traversal ticks; for equal cost, compare connection-ID sequences lexicographically. Disabled connections and tag-incompatible connections are excluded.
- Add `traversalTicks(baseDurationTicks, speedPermille) = ceil(baseDurationTicks × 1000 ÷ speedPermille)`.
- Extend `TransportMovement` with the current location, planned path, connection ids, leg index, and progress. Both `physical` and `abstract` units use the same deterministic traversal and arrival contract.
- Implement phase 16 `advanceTransport`: advance every moving unit by one tick, update its location and leg on arrival, emit `TransportArrived`, and record the tick's arrivals in scratch for later transport phases.
- Theme-free tests for traversal time, equal-cost stability, disabled edges, unreachable targets, and multi-tick arrival.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sim/transport`: route planning, traversal time, movement advancement, and arrivals.

## Impact

- **Packages:** `@aesfw/core` (`sim/transport/route`, phase 16), `@aesfw/app` (movement initialization carries the current location).
- **Tick phases:** phase 16 `advanceTransport` (reads `movement` and `location`; writes `movement`; emits `TransportArrived`).
- **Store kinds:** existing `movement` and `location`; no new store kind.
- **Commands/events:** event `TransportArrived`. **Error codes:** none. **Diagnostic codes:** none.
- **Protocol/save format:** no protocol change. Movement is an existing component; existing goldens are unchanged because no existing fixture has movement.
- **Dependencies on archived changes:** 6.2 `add-transport-units-and-cargo` (archived 2026-10-23).

## Out of Scope

- 6.4 `add-transport-orders-and-stations`: orders, station cursors, handling, and transport commands. 6.3 plans and moves a path but does not decide when a unit should start one.
- 6.5 `add-transport-quantity-rules`: load and unload quantities.
- 8.2 `add-knowledge-and-exploration`: discovery on arrival. Phase 18 remains a no-op for fog.
- Abstract transport's presentation interpolation; the client map is 6.8.
