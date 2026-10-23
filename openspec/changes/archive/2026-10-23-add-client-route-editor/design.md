# Design

## Context

6.9 is the last M6 row. It reuses the transport detail read model from 6.6 and the snapshot transport summary from 6.8. No simulation phase changes.

## Decisions

### D1 — Orders need a list read model

The snapshot exposes transport units but not order entities. The editor needs every order, including unassigned ones, so `transportOrders(session)` projects the `transportOrder` store. It reuses `stationDtos` from the transport-detail read model to keep the station/action shape identical.

### D2 — Draft is client-local

The editor keeps a `RouteDraft` in view state. `draftFromOrder` loads an existing order; `emptyDraft` starts a two-station load/unload route. `draftPayload` converts the draft to the command payload, including rule quantities and price limits. Nothing is written until the user saves.

### D3 — Command callbacks

The view receives callbacks and never talks to the session directly. The composition root maps each callback to a `client.command` envelope. This keeps the view testable and preserves the rule that only the mirror is authoritative.

### D4 — Refreshing after a command

An accepted command triggers a `transport_orders` query. Unit details refresh when the user selects a unit, or on the next snapshot/delta through the unit list. This avoids optimistic state and keeps the client free of mechanics.

### D5 — Rule and price fields

The action row exposes all eight quantity rules. Quantity is shown for rules that need it; price limit is captured for `buy`/`sell` but exchange execution is later. `priority_list` is sent as a one-entry list from the editor; a richer multi-entry editor can arrive with exchange work.

## Phases and stores

No phase or store changes. The read model is on demand; the query is `{ kind: 'transport_orders' }`.

## Ordering and rounding

Units and orders are ordered by ascending entity id. Actions keep station order. No arithmetic beyond id and number conversion.

## Amendments

No amendment to 01–04 is required.

## Risks

- The editor re-renders on `change` events, not on every keystroke; focus is preserved while typing.
- A newly created order appears only after the next `transport_orders` query; the accepted command triggers it.
- Multi-entry priority lists and exchange price execution remain later work.
