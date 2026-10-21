# Proposal

## Why

Roadmap 08, M1 item 1.11 (`add-residences-and-population-outputs`, capability `sim/population`, size M). The M1 loop needs inhabitants: a residence holds an aggregate population that consumes needs and, crucially, produces the tier capability the producer requires (GDD-11.3). This row delivers residences, population groups, and the capability outputs of phase 26 with rate accumulators, retiring R-04. Depends on: `add-capability-allocation` (1.9) — archived 2026-10-21.

## What Changes

- Add the `residence` and `populationGroup` runtime components, with the tier's resolved outputs.
- Add world-resident rate-accumulator helpers keyed by `(subject, purpose, resource)`.
- Implement phase 26 `applyContinuousOutputsAndMaintenance` for capability outputs only: for each residence, accumulate `count × rate_per_population_per_tick` and publish a `capabilityProvider` for the next tick.
- Add unit tests for residence state, accumulator carry, and zero-population output.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `sim/population`: residences, population groups, and population capability outputs with rate accumulators.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/population/**` and implements phase 26. No new runtime dependency is added.
- **Tick phases:** 26 (outputs only). **Store kinds:** `residence`, `populationGroup`; writes `capabilityProvider`. **Events:** `PopulationOutputProduced`.
- **Out of scope:** need demand and consumption (1.12), growth (1.13), satisfaction scaling of outputs (1.12), owner-scoped income and maintenance (4.1, 4.2), residence decay and transitions (7.3).
- **Verification impact:** `pnpm test` gains population unit tests.
