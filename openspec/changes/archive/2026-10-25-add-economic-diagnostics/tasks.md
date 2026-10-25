# Tasks

## 1. Stage and severity model

- [x] 1.1 [CONT-11.6] Add `economic_diagnostics: 'warning' | 'error'` to `LoadOptions` (default `warning`); add `validateEconomics(definitions, options)` to the validation stage and call it from `validateGraphs`; severity follows the option. Verify: unit tests (warning loads, promoted fails).

## 2. The seven CONT-11.6 checks

- [x] 2.1 [CONT-11.6] `capability_deficit` and `negative_maintenance_balance`. Verify: unit tests (no provider, income-bearing balance).
- [x] 2.2 [CONT-11.6] `inadequate_production` and `throughput_below_equilibrium` with the D2 static rate model. Verify: unit tests (outrun demand, balanced, import below carrier capacity).
- [x] 2.3 [CONT-11.6] `storage_below_batch`, `transition_self_lock`, `exchange_arbitrage_risk`. Verify: unit tests (small inventory, self-locked transition, arbitrage loop, balanced chain reports nothing).

## 3. Catalogue, fixtures, false-positive guard

- [x] 3.1 [VER-10.2] Add the seven codes to `diagnostics/catalogue.ts` with stage `economic`; one invalid fixture per code with `expect.yaml` (severity `warning`); cross-check extends to economic codes. Verify: catalogue tests green.
- [x] 3.2 [CONT-11.6] Test that every `fixtures/content/demo-*` package loads with zero economic findings; confirm ref.tier unchanged. Verify: test green, no golden file changed.

## 4. Documentation and verification

- [x] 4.1 Run `pnpm trace`; CONT-11.6 traced. Verify: report shows CONT-11.6 traced.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`. Verify: command output green.
