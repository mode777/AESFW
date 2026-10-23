# Proposal

## Why

Roadmap 08, M6 item 6.8 (`add-client-world-map`). The simulation now has multiple locations and moving transport units, but the reference client can only show one location grid. This change adds the REF-12.1 world map, transport dots, connection durations, and R2 reference content with a second location, retiring the gap that inter-location logistics is invisible in the browser.

## What Changes

- R2 reference content: a connection definition, a transport unit, an order template, and `ref.tier.world.r2` with two connected locations. The p2 extractor starts at the second location and the production chain at the first, creating a real cross-location dependency.
- Snapshot additions: location `connection_details` (origin, destination, duration, enabled) and an entity `transport` summary (state and order id). Transport entities report their current location through `entity.location_id`.
- Client world-map selector: deterministic grid layout from location ids, deduplicated connections, transport dots, fog and ownership marks.
- Client world-map view: SVG locations, connection lines with durations, transport dots that interpolate by CSS transform. A `Map`/`Grid` toggle and the `M` key switch views.
- Tests for the selector, R2 content, and projection additions.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `reference/client`: the world-map view and transport interpolation.
- `reference/content`: R2 content with a second location, connection, and transport unit.
- `app/projections`: snapshot connection details and transport summaries.

## Impact

- **Packages:** `@aesfw/protocol` (additive DTO fields), `@aesfw/app` (projection fields), `@aesfw-ref/client-web` (selector, view, toggle), `@aesfw-ref/content` (R2 data).
- **Tick phases:** none.
- **Store kinds:** none new.
- **Commands/events:** none new.
- **Error codes/diagnostic codes:** none.
- **Protocol/save format:** additive snapshot fields; protocol version unchanged. No golden changes.
- **Dependencies on archived changes:** 6.6 `add-transport-read-model` (archived 2026-10-23) and 3.7 `add-client-grid` (archived 2026-10-22).

## Out of Scope

- 6.9 `add-client-route-editor`: creating and editing routes from the client.
- Fog filtering of projections (8.4); the map draws the knowledge field it receives.
- Region clustering (8.1); the layout is a deterministic id grid.
