# Proposal

## Why

Roadmap 08, M9 item 9.4 (`add-golden-exchange`). SCN-06 ("exchange trade and elasticity; repeated sales lower the price, which then recovers", GDD-17) is M9's exit scenario, and 06 §9.3 requires every scenario to exist as a theme-free fixture with a committed golden. The exchange mechanics are complete (9.1 price state, 9.2 trade execution, 9.3 quotes); without the golden, SCN-06 is unverified and M9 cannot close.

## What Changes

- A new theme-free scenario `fixtures/scenarios/exchange_loop.yaml` over the `demo-exchanges` content package (extended with owner starting credits and a transport unit at the exchange location): a transport unit buys from the exchange (raising the purchase price), sells in repeated steps (lowering the sale price), waits through recovery intervals, and sells again at the recovered price.
- The golden `fixtures/scenarios/exchange_loop.hashes.json` with checkpoint hashes (`fnv1a64-canonical-json-v1`), invariant checks after every tick, and a host-node consumer test asserting zero findings, the exact traded price sequence (buys at 1000/1100/1200, sells at 800/720/640, final sale at the recovered 800), and byte-identical repeat runs.

## Capabilities

### Modified Capabilities

- `testkit/scenarios`: the SCN-06 scenario fixture and golden.

## Impact

- **Packages:** `@aesfw/host-node` (consumer test), fixtures only otherwise.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error/diagnostic codes:** none new.
- **Protocol/save format:** unchanged. **HASH-CHANGING:** new golden only for the new scenario; no existing golden changes.
- **Dependencies on archived changes:** 9.2 `add-trade-execution` (archived 2026-10-24).

## Out of Scope

- 9.5 `add-client-exchange-view`: the client drawer (SCN-06's client leg).
- SCN-14/SCN-18: reference-content scenarios (M11).
