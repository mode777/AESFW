# Proposal

## Why

Roadmap 08, M9 item 9.1 (`add-exchange-price-state`). GDD-17 defines exchanges as fixed trading counterparties that buy and sell resources against an owner-scoped balance resource, and GDD-3.11 makes them "a buffer and a source of starting capital, never a replacement for domestic production". The pipeline already reserves the seams: phase 17/28 are registered no-ops, `world.exchanges` exists as a saved and hashed store, and `Purpose`, `TransportAction`, and the transaction union already carry their exchange variants. Nothing populates that state: there is no `exchanges` content collection, no instantiation, no elasticity, and no recovery, so M9 cannot proceed and R-12 (exchanges as a money exploit) stays unretired. This change delivers the exchange content surface, the authoritative price state with mandatory elasticity and recovery (phase 28), and INV-12.

## What Changes

- A new `exchanges` definition collection per CONT-6.21: id, location, currency, goods (per-resource `buy_from_exchange` and `sell_to_exchange` base prices with `enabled`), mandatory `elasticity` (window, step quantity, step change, recovery, price bounds), and `shared_between_owners`. Validation rejects a missing `elasticity`, a good whose sell base is not lower than its buy base, and nonsensical bounds; references (location, currency, goods resources) are resolved like any other collection.
- Instantiating a world instantiates one exchange entity per exchange definition at its referenced location, carrying the existing `exchangeRef` component kind, and seeds `world.exchanges` with one price row per enabled good at base prices.
- Price state is authoritative: current buy and sell price per (exchange, resource) plus rolling per-tick sold and bought volume windows, saved, hashed, and cloned with the world (02 §14.5).
- Elasticity is applied when volume is recorded (the function 9.2's trades call): each `step_quantity` traded within `window_ticks` moves the direction's price by `step_change_permille` of the base price, clamped to `[min_price_permille, max_price_permille] × base` (GDD-17.3).
- Phase 28 (`recoverExchangePrices`) replaces its no-op: each tick it prunes the volume windows, and every `recovery_interval_ticks` it moves each price toward its base price by `recovery_permille_per_interval` of the base, without overshooting, still clamped (GDD-17.3).
- INV-12 joins the invariant harness: every price stays within the configured permille bounds around its base.

## Capabilities

### New Capabilities

- `sim/exchanges`: exchange definitions, instantiation, authoritative price state, elasticity, recovery, INV-12.

## Impact

- **Packages:** `@aesfw/core` (price state functions, phase 28, INV-12), `@aesfw/content` (`exchanges` schema, collection registration, reference resolution, validation diagnostics), `@aesfw/app` (world-content instantiation of exchanges), `@aesfw/testkit` (INV-12).
- **Tick phases:** phase 28 filled in. Phase 17 stays a no-op (owned by 9.2).
- **Store kinds:** none new (`exchangeRef` exists; `world.exchanges` exists).
- **Commands/events/error/diagnostic codes:** new content validation diagnostics for the exchange collection. No commands, no events (trading events are 9.2).
- **Protocol/save format:** save format unchanged — `world.exchanges` already encodes/decodes/hashes; the per-direction volume windows refine the existing `volume_window` field into `sold_volume`/`bought_volume` ( HASH-NEUTRAL: every shipped world has an empty price table, so no golden changes).
- **Dependencies on archived changes:** 6.1 `add-world-definition-and-connections` (archived 2026-10-23), 4.1 `add-balance-resources-and-income` (archived 2026-10-22).

## Out of Scope

- 9.2 `add-trade-execution`: trade-mode orders, `buy`/`sell` execution in phase 17, the atomic trade transaction, `Traded` events, INV-13.
- 9.3 `add-exchange-quotes-read-model`: the exchange-quotes read model and its protocol DTO (PIC-10.7) — this change introduces the state; that row owns the client surface.
- M10 `add-graph-validation`: cross-graph diagnostics (recipes sellable above input purchase cost at base prices, GDD-17.3's warning) are graph validation, not collection-local schema validation.
- 13.4 `add-multiple-owners`: per-owner elasticity states; v1 exchanges are shared by construction.
