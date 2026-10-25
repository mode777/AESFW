# Proposal

## Why

Roadmap 08, M9 item 9.5 (`add-client-exchange-view`). REF-12.4's drawer table defines the Exchange view: per exchange the buy and sell price versus base, recent volume, and a recovery estimate from the exchange-quotes read model (04 §10.7, delivered by 9.3), with a shortcut that opens a trade order in the logistics view. Without it, M9's exit criterion — "repeated sales visibly lower prices, which then recover" — is only demonstrable in tests, not by playing.

## What Changes

- A new exchange drawer in the reference client: per exchange (entities whose definition belongs to the exchange collection, resolved through definition metadata), the per-good quotes — current buy and sell price versus their bases, recent volume, recovery estimate — from the additive `exchange_quotes` query (9.3).
- A trade-order shortcut per good: Buy and Sell buttons build a trade-mode route draft (single station at the exchange endpoint, fixed quantity, optional price limit) through a pure selector and open the logistics drawer's route editor prefilled (the existing client-local draft mechanism), where the player assigns a unit and dispatches it.
- The drawer joins the keyboard map with `X` (drawer action), alongside the existing economy, planning, logistics, and population drawers.
- Reference content ships no exchange yet (M11's R4 content owns the first playable exchange); the drawer renders an empty state, and the framework fixture demonstrates the flow end to end.

## Capabilities

### Modified Capabilities

- `reference/client`: the exchange drawer, quote rendering, and the trade-order shortcut (REF-12.4).

## Impact

- **Packages:** `@aesfw-ref/client-web` only (view, selector, i18n strings, keyboard wiring). The client continues to import only `@aesfw/protocol` and `@aesfw/host-web/client`.
- **Tick phases / store kinds / protocol / host:** none — the client consumes the 9.3 query as-is.
- **Dependencies on archived changes:** 9.3 `add-exchange-quotes-read-model` (archived 2026-10-25), 6.9 `add-client-route-editor` (archived 2026-10-23).

## Out of Scope

- 11.1 `add-reference-content-prototype`: R4 exchange content for a populated drawer.
- 13.4 `add-multiple-owners`: per-actor exchange competition displays.
