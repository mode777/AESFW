# Proposal

## Why

Roadmap 08, M6 item 6.9 (`add-client-route-editor`). The client can show the world map, but a player cannot create, inspect, modify, assign, or delete a transport route. This change adds the REF-12.4 logistics drawer and route editor, completing M6's playable logistics surface.

## What Changes

- New app read model `transportOrders(session)` and protocol `TransportOrderDto`, exposed through the `transport_orders` query.
- New pure logistics selector: transport units from the snapshot, order rows and details from the read model, selected-unit detail, route drafts, draft validation, and command payload conversion.
- New logistics drawer and route editor: unit list, order list, selected detail (state, cargo, progress, failures), station/action editing with all quantity rules and price limits, create/modify/delete, and assign/unassign.
- Drawer key `L` and integration with the existing economy/planning drawer.
- Tests for the selector, order list read model, and draft round-trip.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `reference/client`: the logistics drawer and route editor.
- `app/projections`: the transport-order list read model.

## Impact

- **Packages:** `@aesfw/protocol` (order DTO), `@aesfw/app` (order list read model), `@aesfw/host-web` (`transport_orders` query), `@aesfw-ref/client-web` (selector, view, drawer wiring).
- **Tick phases:** none.
- **Store kinds:** none new.
- **Commands/events:** the editor issues `CreateTransportOrder`, `ModifyTransportOrder`, `DeleteTransportOrder`, `AssignTransport`, and `UnassignTransport`; no new command.
- **Error codes/diagnostic codes:** none.
- **Protocol/save format:** additive read model only; protocol version unchanged. No golden changes.
- **Dependencies on archived changes:** 6.8 `add-client-world-map` (archived 2026-10-23) and 6.6 `add-transport-read-model` (archived 2026-10-23).

## Out of Scope

- Drag-and-drop route editing on the map; the editor is a structured form.
- Exchange buy/sell price execution; price limits are captured for later exchange rows.
- M11 reference balancing and scripted strategies.
