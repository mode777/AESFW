# Proposal

## Why

Roadmap 08, M1 item 1.9 (`add-capability-allocation`, capability `sim/capabilities`, size M). Recipes require capabilities (03 §14 uses a tier capability), and capability supply is recomputed every tick rather than stored in inventories. This row delivers phases 05–06: rebuilding location-scoped capability pools from providers and allocating them to consumers under the four models of GDD-14.2, with exact matching and explicit substitutes (GDD-4.7), retiring R-04. Depends on: `add-abstract-capacity-locations` (1.8) — archived 2026-10-21.

## What Changes

- Add the `capabilityProvider`, `capabilityConsumer`, and `capabilityAllocation` component runtime shapes.
- Implement phase 05 `rebuildCapabilitySupply`: clear the per-tick pools and aggregate provider rates by `(scope, location, capability)` in ascending entity order.
- Implement phase 06 `allocateCapabilities`: group consumer requests by pool, allocate with the binary, proportional (`alloc-v1`), priority, and weighted models, and publish a `capabilityAllocation` component per consumer.
- Exact matching and explicit substitutes: a request draws only from its capability or its configured substitutes, in deterministic order.
- Extend `testkit/harness` `checkInvariants` with INV-05.
- Add unit tests for each model, matching, substitutes, ordering, boundaries, and inactive exclusion.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `sim/capabilities`: the capability provider, consumer, and allocation state, the supply rebuild of phase 05, and the allocation of phase 06.

### Modified Capabilities

- `testkit/harness`: `checkInvariants` additionally evaluates INV-05.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/capabilities/**` and implements `phase-05-rebuild-capability-supply.ts` and `phase-06-allocate-capabilities.ts`; `@aesfw/testkit` extends `harness/invariants.ts`. No new runtime dependency is added.
- **Tick phases:** 05 and 06 become real systems; their `reads`/`writes` are declared. **Store kinds:** `capabilityProvider`, `capabilityConsumer`, `capabilityAllocation`. **Commands/events:** `CapabilityShortageDetected` events; no commands yet.
- **Out of scope:** population capability outputs (1.11), production capability requirements in phases 07 and 11–13 (1.10), throughput allocation (5.1), the read model (app/projections), and the explicit-substitution content validation (10.1).
- **Verification impact:** `pnpm test` gains capability unit tests and INV-05 in `checkInvariants`.
