# Proposal

## Why

Roadmap 08, M9 item 9.3 (`add-exchange-quotes-read-model`). PIC-10.7 defines the exchange-quotes read model: exchange and region, per good the current buy and sell price, base prices, recent volume, and a recovery estimate, with the quote validity revision — informative data that never feeds back as authority. The exchange price state exists (9.1) and trades execute (9.2), but a client cannot see a single quote: no DTO, no read model, no host query routing. The client exchange view (9.5) and the SCN-06 exit criterion ("repeated sales visibly lower prices") need this surface.

## What Changes

- A new `ExchangeQuotesDto` (protocol, additive): the exchange entity and its location and region, the currency, the quote validity revision, and per good the current buy and sell price, both base prices, the in-window sold and bought volume, and an informative recovery estimate in ticks toward each base price.
- A new application-layer read model `exchangeQuotes(session, actor, exchange)` in `@aesfw/app`, following the transport-detail pattern: pure, derived from `world.exchanges` and the exchange definition through the registry, never written back. Quotes are informative by construction (04 §10.7).
- Fog filtering (8.4): the read model returns no result when the requesting actor does not know the exchange's location; quotes are location-bound economic data like entity detail.
- The web-worker host routes a new additive `exchange_quotes` query kind to the read model.

## Capabilities

### Modified Capabilities

- `app/projections`: the exchange-quotes read model with fog gating and host query routing (PIC-10.7).

## Impact

- **Packages:** `@aesfw/protocol` (DTO + codec), `@aesfw/app` (read model), `@aesfw/host-web` (query routing).
- **Tick phases:** none. **Store kinds:** none.
- **Commands/events/error/diagnostic codes:** none new.
- **Protocol/save format:** additive optional query kind and DTO; no version bump. HASH-CHANGING: no (read models are not hashed).
- **Dependencies on archived changes:** 9.1 `add-exchange-price-state` (archived 2026-10-24), 2.4 `add-core-read-models` (archived 2026-10-22).

## Out of Scope

- 9.4 `add-golden-exchange`: the SCN-06 scenario and golden.
- 9.5 `add-client-exchange-view`: the client drawer and the trade-order shortcut that consumes these quotes.
- 13.4 `add-multiple-owners`: per-actor quote subscriptions.
