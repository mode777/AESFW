# Design

## Context

6.8 is presentation plus R2 content. It uses the transport detail model from 6.6 but does not add a new simulation phase.

## Decisions

### D1 — Layout without a region model

Regions arrive in 8.1. Until then, the map sorts locations by ascending entity id and lays them out in a `ceil(sqrt(n))` column grid. The layout is pure and deterministic; it is not authoritative and is not saved.

### D2 — Connection details are additive snapshot data

`LocationDto` already carried connection ids. It now also carries `connection_details` so the client can draw endpoints and durations without a second query. The list is the same `location.connections` array, so bidirectional connections appear at both endpoints; the selector deduplicates by id.

### D3 — Transport dots come from a snapshot summary

`EntityDto` gains an optional `transport` summary. The projection derives it from movement, assignment, order, and station cursor, and reports the movement location as `location_id`. This keeps the map's per-tick data in the snapshot and avoids a query per unit.

### D4 — Interpolation is visual only

The view positions each dot with an SVG `transform` and CSS `transition: transform 250ms linear`. When a delta changes the authoritative location, the dot moves; the simulation never waits for the animation. This matches REF-14.3's rule that interpolation converges to authority.

### D5 — R2 content keeps the existing chain

The R2 world reuses `ref.tier.location.a` for both locations. The p2 extractor starts at `ref.tier.loc.b`; the p1 extractor, refiner, combiner, connector, storage, residence, and transport start at `ref.tier.loc.a`. The client therefore sees a real cross-location dependency without changing the existing R1 recipes. The client selects the first world definition, which is `ref.tier.world.r2`.

## Phases and stores

No phase or store changes. Projection reads `location.connections`, `movement`, `transportAssignment`, `transportOrder`, and `stationCursor`.

## Ordering and rounding

Locations are ordered by ascending entity id. Connections are ordered by ascending connection id and deduplicated by the selector. No arithmetic beyond layout constants.

## Amendments

No amendment to 01–04 is required.

## Risks

- The map uses a simple id grid, not region clusters. 8.1 can replace the layout without changing the view contract.
- R2 changes the reference client's initial world from the implicit one-location plan to a two-location world. Reference tests still pass; M11's reference scenario will tune the new logistics loop.
- Transport interpolation is a CSS transition, not a tick-accurate path animation. The authoritative state remains the source of truth.
