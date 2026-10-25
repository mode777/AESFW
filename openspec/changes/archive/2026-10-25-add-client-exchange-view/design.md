# Design

## Context

The client drawer pattern is established (economy, planning, logistics, population): a mounted view module, a pure selector, i18n strings, a drawer key, and query-result wiring in `main.ts`. The logistics route editor (6.9) exposes `prefill(draft)` for explore/establish drafts — the trade shortcut reuses exactly that seam.

## Goals / Non-Goals

- Goals: exchange drawer with quotes, trade shortcut into the route editor, `X` key.
- Non-Goals: R4 exchange content (11.1), price charts/history (12.x), multi-owner views (13.4).

## Decisions

### D1 — Exchanges identified via definition metadata + projection entities

The drawer queries `definition_metadata` for type `exchange` (9.3's host routing already carries arbitrary definition types) and intersects the returned ids with the projection entities' `definition_id`. This needs no new protocol surface and survives fog (unknown locations have no entities in the projection).

### D2 — Quotes requested per drawer render

Opening the drawer (and each projection revision while it is open) queries `exchange_quotes` per exchange entity; results re-render the rows. Quotes are informative and point-in-time (PIC-10.7), so no client-side caching beyond the last response.

### D3 — The shortcut is a pure selector over a quotes row

`tradeDraft(quotes, resource, direction, quantity)` returns the `RouteDraft`; `main.ts` prefills the logistics view and switches the drawer to `logistics`. Quantity defaults to the recent volume rounded up to a tradable amount (the recent volume is the client's best local hint); the player edits it in the editor before dispatching. No command is sent by the shortcut itself.

## Clarifications recorded (no normative amendment)

- The default draft quantity is the quoted recent volume (or `1` when it is zero); the editor is the authority for what is dispatched (D3).
- No new i18n keys beyond the drawer's labels; resource and definition ids render as-is like every other id-based row (REF-12.4 precedent).

## Risks / Open Questions

- With no reference exchange content until M11, the drawer's live path is exercised by framework fixture sessions (dev server) and pure selector tests; the Playwright flow is added with 11.1's content.
