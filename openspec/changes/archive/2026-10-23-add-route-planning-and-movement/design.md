# Design

## Context

6.3 turns the movement configuration from 6.2 into actual traversal. Orders and station actions are 6.4; quantity rules are 6.5.

## Decisions

### D1 — Route planner is a deterministic Dijkstra

`planRoute` minimizes total traversal ticks. Ties are broken by lexicographic comparison of the connection-id sequence, matching ARCH-14.3's `shortest_stable`. The open set is a small array scanned with a total-order comparator, so the result does not depend on insertion order. Distances are integers (`Int`) and use `fx.mulDiv` with `ceil`; no floating point enters the path.

The planner reads `location.connections`, which is already sorted by connection id at instantiation. It follows a connection in the direction allowed by its runtime `origin`, `destination`, and `direction`.

### D2 — Movement is one component with an optional path

`TransportMovement` gains `location`, `path`, `connectionIds`, `step`, and `progress`. `startMovement` writes the path and sets the current location to the first path location. `advanceMovement` reads the current leg's connection each tick, computes its traversal time, and either increments progress or moves to the next location and increments `step`.

The arrival location is authoritative in `movement.location`; transport entities do not get a `location` component because they are not placed in a location grid.

### D3 — Abstract and physical modes share mechanics

`mode` is stored but does not change traversal in M6. ARCH-14.2 requires abstract transport to emit the same load/depart/arrive/unload events; sharing the path and arrival code is the simplest way to guarantee parity. The client may render abstract units differently in 6.8.

### D4 — Phase 16 writes only movement

Phase 16 advances units in ascending entity ID, writes `movement`, emits `TransportArrived`, and stores arrivals in `TRANSPORT_ARRIVALS_KEY` for phases 18–19. It reads `location` to resolve the current leg's connection. No transaction is involved because no quantity moves yet.

## Phases and stores

- Phase 16 `advanceTransport`: reads `movement`, `location`; writes `movement`.
- Scratch: `TRANSPORT_ARRIVALS_KEY`.

## Ordering and rounding

Units advance in ascending entity ID. Connections are considered in ascending connection-id order. Traversal uses `ceil` and safe-integer arithmetic.

## Amendments

No amendment to 01–04 is required.

## Risks

- The planner is O(V² + E) per call; M6 graphs are small and 6.4 plans only on assignment or invalidation. If the reference graph grows, a later row can add a cached route table in `world.caches.routes`.
- Phase 18 does not yet mark discovery; 8.2 owns fog. Arrivals are recorded so 8.2 can consume them without changing phase 16.
- A movement path is not invalidated when a connection is disabled after planning. 6.4 owns replanning policy (`path_unavailable`).
