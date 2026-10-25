# Tasks

## 1. Stage and knob

- [x] 1.1 [CONT-11.7] Add `design_intent: 'off' | 'warning' | 'error'` and `ratio_legibility_threshold` to `LoadOptions` (defaults `off`, `10`); `validateDesignIntent(definitions, options)` wired into `validateGraphs`, emitting nothing when off. Verify: unit tests (off default, warnings, promoted fails).

## 2. The ten checks

- [x] 2.1 [GDD-3.2] `inactive_scarcities` with the seven-activity audit. Verify: unit tests (missing scarcities named, all active clean).
- [x] 2.2 [CONT-11.7] `self_sufficient_region` and `cross_region_absent`. Verify: unit tests (self-sufficient region, cross-region top tier, single-region top tier).
- [x] 2.3 [CONT-11.7] `pyramid_bypass`, `breadth_depth_collapse`, `coverage_absent`. Verify: unit tests (substitute, collapsed category, no coverage, intent-bearing clean).
- [x] 2.4 [CONT-11.7] `idle_cost_absent`, `decline_symmetric`, `unbounded_trade`, `ratio_illegible`. Verify: unit tests (each fired; asymmetric bounded content clean).

## 3. Catalogue and fixtures

- [x] 3.1 [VER-10.2] Add the ten codes (stage `design_intent`); invalid fixture per code; extend the catalogue cross-check to design-intent codes loading with `design_intent: 'warning'`. Verify: catalogue tests green.
- [x] 3.2 [VER-10.2] Create `fixtures/content/valid/design-intent/` activating every idea; assert zero findings under `design_intent: 'warning'` and failure under `'error'`-clean content. Verify: test green.

## 4. Documentation and verification

- [x] 4.1 Run `pnpm trace`; CONT-11.7 and GDD-3.2 traced. Verify: report.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`. Verify: green, no golden changed.
