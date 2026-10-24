# Design

## Context

The exchange seams are pre-wired: `world.exchanges: ExchangePriceTable` exists in the world record with encode/decode/hash support (02 §14.5), `'exchange'` is a `DefinitionType`, `'exchangeRef'` is a component kind, phase 17/28 are registered no-ops, and the tx union already declares a `trade` variant. What is missing is everything content- and behavior-side: the collection, instantiation, the elasticity and recovery semantics, and INV-12.

## Goals / Non-Goals

- Goals: the `exchanges` collection with CONT-6.21 validation, instantiation into entities plus price rows, the elasticity step rule, phase 28 recovery, INV-12.
- Non-Goals: trade execution (9.2), quotes read model and protocol surface (9.3), SCN-06 (9.4), client (9.5), per-owner elasticity (13.4), cross-graph diagnostics (M10).

## Decisions

### D1 — Exchanges are entities at their location

GDD-17.2 allows "a world node or an entity"; v1 uses one form: an exchange entity at the resolved location instance, carrying `exchangeRef` (the existing component kind). The entity id is the `exchange` key of the price row, a stable event subject for 9.2, and the endpoint a trade station names. `shared_between_owners` is accepted and recorded, but v1 has a single price state per exchange shared by all owners; per-owner split is 13.4.

### D2 — Two volume windows per direction

GDD-17.3 couples sold volume to the sell price and bought volume to the buy price. The pre-wired `ExchangePrice.volumeWindow: readonly Int[]` becomes two fields, `soldVolume` and `boughtVolume`, each a list of dated `(tick, quantity)` entries ascending by tick, pruned to the entries inside `window_ticks` (exact "within the window" semantics, sparse-friendly). The codec's `volume_window` field becomes `sold_volume`/`bought_volume`. HASH-NEUTRAL for all shipped goldens: every existing world encodes an empty price table, so the canonical bytes are unchanged; no golden is regenerated (06 §9.4). A price row exists for every good of an exchange; a side's `enabled` flag is recorded in content and gates trading in 9.2, not the row's existence.

### D3 — Elasticity as incremental steps over the window

Recording quantity `q` in direction `d` at tick `t`:
1. Merge `q` into the direction's per-tick bucket for `t` (pruning entries older than `window_ticks`; buckets are `(tick, quantity)` entries ascending by tick, so sparse trading stays exact).
2. Let `V0` be the in-window volume before the merge and `V1` after; `k = floor(V1 / step_quantity) − floor(V0 / step_quantity)`.
3. `price_d ← clamp(price_d ∓ k · base·step_change_permille / 1000, base·min/1000, base·max/1000)` (buy direction `+`, sell direction `−`).

Steps are only added by new volume; volume aging out never moves a price by itself (D3 distinguishes stepping from recovery cleanly and keeps the rule local). Rounding is **floor everywhere** (`mulDiv(…, 'floor')`): the step amount, the clamp bounds, and the recovery step all floor, so a price never crosses the configured permille fraction outward. A configured permille step of `> 0` that floors to zero on a small base escalates to `1` so configured progress is preserved; a permille of `0` moves nothing.

### D4 — Recovery in phase 28, tick-modulo aligned

Phase 28 runs every tick after trades (17). Per tick it prunes both windows to the entries inside `window_ticks` of the current tick. When `tick mod recovery_interval_ticks === 0`, each price moves toward its own base price (buy toward the buy base, sell toward the sell base) by `base·recovery_permille_per_interval / 1000` (floored, at least 1 when configured positive), never passing the base and never leaving the clamp bounds. Tick-modulo alignment is stateless and deterministic; an exchange instantiated mid-session simply joins the global rhythm.

### D5 — Content schema and validation live in `@aesfw/content`

New `schemas/exchange.ts` (TypeBox, `additionalProperties: false`, snake_case fields) registered in `DEFINITION_SCHEMAS`/`DEFINITION_COLLECTIONS` as `exchanges → exchange` and appended to `COLLECTION_ORDER` at the end so existing handle spaces are unchanged. Reference resolution validates `location` against location templates and `currency`/goods resources against resources, replacing the 7.5-era skip comment for exchanges in `references.ts`. Collection-local diagnostics: missing elasticity, inverted spread (`sell base ≥ buy base`), `min ≥ max`, `min ≤ 0`, non-positive `step_quantity`/`window_ticks`/`recovery_interval_ticks`. The GDD-17.3 recipe warning is cross-graph and stays with M10's `add-graph-validation`.

### D6 — Instantiation in the app content layer

`instantiateWorldContent` walks `registry.handlesOf('exchange')` after locations exist, resolves the location entity from the template-to-location mapping produced by world instantiation (exposed on the plan result), allocates the entity, sets `exchangeRef` and the generic `definition` component, and inserts price rows into `world.exchanges` sorted by `(exchange entity id, resource handle)`. Disabled goods are skipped. No new store kind; the exchange entity is a plain entity so fog, encoding, and projection rules apply unchanged.

### D7 — INV-12 reads bounds from the registry

`checkExchangePrices(world, registry, findings)` resolves each row's exchange entity through the `exchangeRef` component to `registry.definitionDataOf('exchange', …)`, recomputes the base-price bounds with the same ceiling helpers as D3, and reports a finding when a price is outside them. A missing definition or component is an INV-12 finding too (the state without its content is malformed). INV-13 arrives with 9.2.

## Clarifications recorded (no normative amendment)

- `volumeWindow` splits into `soldVolume`/`boughtVolume` (D2); hash-neutral for shipped content.
- Elasticity steps only from new in-window volume; aging out is recovery's job (D3).
- Recovery is tick-modulo aligned and never overshoots the base price (D4).
- v1 exchanges are shared by all owners regardless of `shared_between_owners` (D1; per-owner is 13.4).
- The `exchange_price` condition query remains registered-but-unevaluated until a row owns content-condition domain queries over exchanges (candidate: M10 validation or a future need); no spec claims it here.

## Risks / Open Questions

- The window is `O(window_ticks)` integers per (exchange, resource); with the documented 600-tick window this is bounded and bench-invisible for fixtures without exchanges. If a future content set widens windows, M12's performance row revisits the representation.
- Template-to-location resolution must survive worlds where the referenced template is not instantiated (unestablished or generated worlds): instantiation SHALL skip such exchanges with a diagnostic rather than fail the session.
