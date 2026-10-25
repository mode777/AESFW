# Tasks

## 1. Stage

- [x] 1.1 [CONT-11.8] Create `validation/determinism.ts` with `validateDeterminism(files, packages)`; wire into `loadContent` after schema validation. Verify: type-check.

## 2. Checks

- [x] 2.1 [CONT-11.8] Wall-clock and random deny-lists over condition expressions; executable-script string markers. Verify: unit tests (each fired; clean conditions pass).
- [x] 2.2 [CONT-11.8] Safe-integer scan over all raw documents. Verify: unit test (float rejected, integers pass).
- [x] 2.3 [CONT-11.8] Optional-module override check (`framework.` IDs, cross-package IDs). Verify: unit tests (framework ID, owned ID, additive module passes).

## 3. Catalogue and fixtures

- [x] 3.1 [VER-10.2] Add the five codes (stage `determinism`); invalid fixture per code; extend the catalogue cross-check. Verify: catalogue tests green.

## 4. Documentation and verification

- [x] 4.1 Run `pnpm trace`; CONT-11.8 traced. Verify: report.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`. Verify: green, no golden changed.
