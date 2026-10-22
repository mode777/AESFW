# Tasks

## 1. Core: curve evaluation and transaction environment

- [x] 1.1 Add `evaluateCompiledCurve` to `@aesfw/core` fx (CONT-8, TDS-14.4): constant/piecewise_linear/step/lookup over sorted points, clamp/linear/error extrapolation, floor interpolation via `fx.mulDiv`; export from the package index. Verify: new `fx/curve.test.ts` covers the four curve types and three extrapolations.
- [x] 1.2 [TDS-14.4] Property test: piecewise-linear evaluation is monotone non-decreasing on non-decreasing point arrays and equals the floor of exact interpolation (fast-check). Verify: `pnpm test -- curve`.
- [x] 1.3 Refactor `@aesfw/content` `evaluateCurve` to delegate to `fx.evaluateCompiledCurve`, keeping diagnostics for the `error` policy at the content layer. Verify: existing `conditions/curves.test.ts` passes unchanged.
- [x] 1.4 Add `resourceAllowsNegative(registry, handle)` and `txEnvironmentFor(registry)` in `@aesfw/core` tx; wire `step`/`runPhases`/`runSystem` to `createTransactionWriter(world, journal, txEnvironmentFor(registry))`. Verify: existing tx tests pass; new unit test asserts the predicate reads raw resource data.

## 2. Core: balance resources and income

- [x] 2.1 [GDD-7.5] Unit test: account op with `allow_negative` resource reaches `-100`; non-balance resource rejects with `insufficient_balance` at `0`. Verify: `tx/builder.test.ts` cases.
- [x] 2.2 [CONT-6.3, TDS-20.2] Extend `applyPopulationOutputs(world, registry, tx, events)` per design D3 (all outputs; first recomputed-storage output publishes the provider; normal-storage outputs credit the location owner's account with curve-scaled accumulate; `'population_income'` reason; owner-attributed `PopulationOutputProduced`). Update the phase-26 descriptor reads/writes (`satisfaction` read; `owners`, `ledger` write). Verify: phase-26 unit tests.
- [x] 2.3 [GDD-11.3] Unit test: income credited to location owner (`count 10 × rate 100 → 1000`). Verify: `sim/population/population.test.ts`.
- [x] 2.4 [GDD-11.3] Unit test: satisfaction curve scales income (`curve(500) = 500`, z `500` → credit `500`). Verify: same file.
- [x] 2.5 [GDD-11.3, TDS-6.4] Unit test: fractional income accumulates across two ticks (`0` then `1`). Verify: same file.
- [x] 2.6 [GDD-11.3] Unit tests: zero population produces no income and no event; residence without location or with ownerless location produces nothing; satisfaction component absent defaults to full rate. Verify: same file.
- [x] 2.7 [GDD-11.3, ARCH-13] Unit test: capability + income outputs coexist — provider carries the capability rate, income credits separately; second capability output does not displace the first. Verify: same file.
- [x] 2.8 [GDD-20.2, ARCH-9] Unit test: income emits `PopulationOutputProduced` with owner, residence, resource, amount; zero amount emits nothing. Verify: same file.

## 3. Content: validation and instantiation

- [x] 3.1 [CONT-6.3] Add the `resource_allow_negative_scope` diagnostic (owner/global only) to the content pipeline; cover it with a content-validation unit test (the per-code invalid-fixture suite is M10's `add-economic-diagnostics`/fixture rows, so no `fixtures/content/invalid` directory is created here). Verify: content validation unit test.
- [x] 3.2 [GDD-11.3, TDS-20.2] Resolve `satisfaction_curve` in app `residenceFrom` to the curve handle (drop the hard-coded `null`). Verify: app instantiation unit test.

## 4. Testkit: invariants and fixture

- [x] 4.1 [GDD-7.5, INV-01] Extend `checkInventoryNonNegative` with the owner-account rule (negative entry without `allow_negative` is a finding). Verify: testkit invariant unit tests for both scenarios.
- [x] 4.2 [GDD-7.5] Add `fixtures/content/demo-economy` (owner-scoped currency with `allow_negative`, capability, producer-fed need, residence tier with capability + curved income output) and a scenario fixture used by integration tests. Verify: `aesfw validate fixtures/content/demo-economy --strict` passes.
- [x] 4.3 [GDD-7.5, GDD-20.2] Integration test: `step` over the `demo-economy` world credits income per tick with `checkInvariants` green, including a negative balance after a manual overdraw; double-run and clone-run hashes equal. Verify: new `sim/economy` integration test via testkit harnesses.

## 5. Documentation and traceability

- [x] 5.1 Update `docs/traceability.md` via `pnpm trace`; confirm no new untraced requirement IDs in claimed sections. Verify: `pnpm trace` exit code.
- [x] 5.2 Record any clarifications (curve-evaluator location) in the change design only; no 01–07 amendment required (TDS-14.4 does not fix the evaluator's package). Verify: design.md section present.

## 6. Verification

- [x] 6.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
