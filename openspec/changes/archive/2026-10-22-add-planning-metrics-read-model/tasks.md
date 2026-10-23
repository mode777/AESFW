# Tasks

## 1. Protocol

- [x] 1.1 [PIC-10.5, TDS-22] Define `PlanningDto`, `PlanningScopeDto`, `PlanningTierDto`, `PlanningChainDto`, `PlanningChainStageDto` and export them; add `decodePlanning` with the standard error convention. Verify: protocol unit tests (two scenarios).

## 2. App read model

- [x] 2.1 [TDS-18.5] Create `readmodels/planning.ts`: exact-rational helpers, per-scope net rates (batch `quantity/duration`, continuous `quantity`), per-tier per-capita and supported population, coverage permille. Verify: unit tests for the net-rate and supported-population scenarios.
- [x] 2.2 [PIC-10.5, GDD-10.6] Chain metrics: stages by definition over producers outputting or consuming the resource, counts, gcd ratios, footprint cells, per-interval maintenance, capability demand. Verify: unit tests for both chain scenarios.
- [x] 2.3 [SCN-18, GDD-3.8] Framework-fixture test: a theme-free extractor→refiner chain whose supported population equals the hand calculation, with coverage over-coverage reported. Verify: `planning.test.ts` SCN-18 case.

## 3. Verification

- [x] 3.1 Run `pnpm trace` (GDD-3.8, GDD-10.6, PIC-10.5 land) and `pnpm verify`; all green, no golden change.
