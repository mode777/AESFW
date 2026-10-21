# Proposal

## Why

Roadmap 08, M1 item 1.12 (`add-needs-and-satisfaction`, capability `sim/needs`, size L). Population consumes resources and its satisfaction drives growth; without demand, delivery, fulfillment, and satisfaction there is no closed loop (GDD-12). This row delivers phases 08, 20, and 21 and establishes INV-08, retiring R-04. Depends on: `add-production-processes` (1.10) and `add-residences-and-population-outputs` (1.11) — archived 2026-10-21.

## What Changes

- Add need and category specifications to the residence, and the `needStates` and `satisfaction` runtime components.
- Implement phase 08 `calculatePopulationDemand` for `resource_consumption` and `resource_availability` needs.
- Implement phase 20 `allocateServicesAndConsumeNeeds`: deliver need resources from shared-location inventories, consuming only consumption needs.
- Implement phase 21 `updateNeedsAndSatisfaction`: fulfillment windows, every category mode, and residence satisfaction `Z`.
- Extend `testkit/harness` `checkInvariants` with INV-08.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `sim/needs`: need demand, delivery, fulfillment windows, category aggregation, and residence satisfaction.

### Modified Capabilities

- `testkit/harness`: `checkInvariants` additionally evaluates INV-08.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/needs/**` and implements phases 08, 20, 21; `@aesfw/testkit` extends `harness/invariants.ts`. No new runtime dependency is added.
- **Tick phases:** 08, 20, 21. **Store kinds:** `needStates`, `satisfaction`; reads `residence`, `inventory`. **Events:** `NeedDemandChanged`, `NeedFulfilled`, `NeedUnfulfilled`.
- **Out of scope:** service-capacity, spatial-coverage, and state-query needs (7.6); satisfaction bands and grace timers (7.2); growth (1.13); need effects (7.2); owner income (4.1).
- **Verification impact:** `pnpm test` gains need unit tests and INV-08 in `checkInvariants`.
