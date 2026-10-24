# Tasks

## 1. Content schema and validation

- [x] 1.1 [CONT-6.21] Add `schemas/exchange.ts` (TypeBox, snake_case, `additionalProperties: false`), register `exchanges → exchange` in the collections catalogue and `COLLECTION_ORDER`, and export the compiled types. Verify: `[CONT-6.21]` schema acceptance tests.
- [x] 1.2 [CONT-6.21, GDD-17.3] Add collection-local validation diagnostics (missing elasticity, inverted spread, bad bounds, non-positive steps/windows) and reference resolution for location/currency/goods (replacing the exchange skip in `references.ts`). Verify: `[CONT-6.21]` valid/invalid fixture tests.

## 2. Price state and instantiation

- [x] 2.1 [ARCH-14.5] Refine `ExchangePrice` to `soldVolume`/`boughtVolume` windows, update encode/decode/hash/clone, keeping the table sorted by `(exchange, resource)`. Verify: `[ARCH-14.5]` codec round-trip and hash tests; all existing goldens unchanged.
- [x] 2.2 [GDD-17.2] Instantiate exchanges in `instantiateWorldContent`: resolve the location instance, allocate the exchange entity with `exchangeRef` and `definition`, seed price rows for enabled goods, skip unresolvable locations with a diagnostic. Verify: `[GDD-17.2]` instantiation tests.

## 3. Elasticity and recovery

- [x] 3.1 [GDD-17.3] Implement the pure `sim/exchanges` module: window recording, step computation, clamp bounds, and a `recordExchangeVolume` entry point for 9.2. Verify: `[GDD-17.3]` elasticity unit tests (steps, both directions, clamps, aged-out volume).
- [x] 3.2 [GDD-17.3, ARCH-14.5] Fill in phase 28: window pruning each tick and tick-modulo recovery toward base without overshoot. Verify: `[GDD-17.3]` recovery unit tests through `runPhases`.

## 4. Invariants

- [x] 4.1 [INV-12] Add `checkExchangePrices` to the harness and wire it into `checkInvariants`; cover the finding path with a crafted world. Verify: `[INV-12]` harness tests; scenario-runner invariants pick it up.

## 5. Fixtures

- [x] 5.1 Add a theme-free `demo-exchanges` content fixture (one exchange, two goods, one balance resource with `allow_negative`) and use it in an integration test covering instantiation → price state → elasticity → recovery in one session. Verify: integration test; `fixtures` valid set passes `aesfw validate --strict`.

## 6. Documentation and verification

- [x] 6.1 Record the D2–D7 clarifications in the design; confirm docs 01–04 need no amendment (behavior matches GDD-17.2/17.3 and CONT-6.21 as written). Verify: no unintended document diff.
- [x] 6.2 Run `pnpm verify` and `pnpm trace`; all green, no new untraced requirement IDs in the claimed sections. Verify: command output.
