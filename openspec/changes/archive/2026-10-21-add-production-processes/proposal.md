# Proposal

## Why

Roadmap 08, M1 item 1.10 (`add-production-processes`, capability `sim/production`, size L). Production is the resource-transformation heart of the M1 loop (01 §23.1): an infinite source feeds a producer that turns inputs into the resource a population needs. This row delivers the source and producer state machines, the all-or-nothing start of GDD-4.3, and phases 07 and 11–13, retiring R-04 and R-03 (phase semantics). Depends on: `add-capability-allocation` (1.9) — archived 2026-10-21.

## What Changes

- Add the `producer` and `resourceSource` runtime components, with resolved recipe specifications (mode, duration, inputs, outputs, capability requirements, condition).
- Implement phase 07 `evaluatePreconditions`: static block reasons (disabled, paused by deficit, invalid recipe, condition false, missing inventory access, inactive location).
- Implement phase 11 `reserveProductionIO`: check capability grants, then reserve inputs and output capacity atomically; a process starts only when every input and capability is fully available (all-or-nothing).
- Implement phase 12 `advanceProcesses`: advance producers and compute source output.
- Implement phase 13 `commitProduction`: atomically commit inputs, deposit outputs, and release capacity; deplete finite sources.
- Support `infinite_rate` and `finite_deposit` source policies; add `finite_deposit` to the resource-source schema.
- Extend `testkit/harness` `checkInvariants` with INV-22, and add production tests that assert INV-15.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `sim/production`: resource sources, the producer state machine, the production block reasons, and phases 07 and 11–13.

### Modified Capabilities

- `content/schemas`: the resource-source component accepts `finite_deposit` with an initial quantity.
- `testkit/harness`: `checkInvariants` additionally evaluates INV-22.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/production/**` and implements phases 07, 11, 12, 13; `@aesfw/content` extends `schemas/entity.ts`; `@aesfw/testkit` extends `harness/invariants.ts`. No new runtime dependency is added.
- **Tick phases:** 07, 11, 12, 13 become real systems. **Store kinds:** `resourceSource`, `producer`. **Events:** `ProductionStarted`, `ProductionBlocked`, `ProductionCompleted`. **Commands:** none yet.
- **Out of scope:** throughput throttling and phases 09–10 (5.1), slot and area sources (3.5), productivity modifiers (12.4), regenerating and condition-dependent sources (3.5), recipe conditions evaluation (deferred: a recipe with a condition is blocked `condition_false` until the domain-query rows), construction and placement (3.2, 3.3).
- **Verification impact:** `pnpm test` gains production unit tests and INV-22 in `checkInvariants`; INV-15 is asserted by the completion tests.
