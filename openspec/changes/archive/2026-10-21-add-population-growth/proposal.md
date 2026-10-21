# Proposal

## Why

Roadmap 08, M1 item 1.13 (`add-population-growth`, capability `sim/population`, size S). The closed loop is only closed when satisfaction moves population: high satisfaction grows a residence toward its capacity and low satisfaction shrinks it. This row delivers phase 23 growth policies and establishes INV-07, retiring R-04. Depends on: `add-needs-and-satisfaction` (1.12) and `add-condition-and-curve-compiler` (1.6) — archived 2026-10-21.

## What Changes

- Add the `growth` runtime component carrying the resolved growth policy: interval, increase and decrease steps, and their conditions.
- Implement phase 23 `updatePopulation`: evaluate each step's condition against residence satisfaction and available capacity, accumulate the fractional rate, and adjust the population within `[0, capacity]`.
- Extend `testkit/harness` `checkInvariants` with INV-07.
- Add unit tests for increase, decrease, capacity clamp, and the interval.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `sim/population`: extends the capability with the growth policy, phase 23, and fraction accumulation.

### Modified Capabilities

- `testkit/harness`: `checkInvariants` additionally evaluates INV-07.

## Impact

- **Packages:** `@aesfw/core` gains `src/sim/population/growth.ts` and implements phase 23; `@aesfw/testkit` extends `harness/invariants.ts`. No new runtime dependency is added.
- **Tick phases:** 23. **Store kinds:** `growth`. **Events:** `PopulationChanged`.
- **Out of scope:** satisfaction bands, grace timers, and `trigger_decline` (7.2); transitions and advancement (7.3); the full condition language for growth (a v1 satisfaction/capacity predicate is used; the general compiled conditions are 7.2).
- **Verification impact:** `pnpm test` gains growth unit tests and INV-07 in `checkInvariants`.
