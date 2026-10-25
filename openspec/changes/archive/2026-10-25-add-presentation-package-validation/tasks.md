# Tasks

## 1. Validator

- [x] 1.1 [PIC-19] Create `packages/content/src/presentation/validate.ts` with `validatePresentationPackage(files, options)` and the six checks; export from the package index. Verify: type-check.

## 2. Checks

- [x] 2.1 [PIC-19] Unit tests: target missing, modifies simulation, invalid key, key missing (warning), fallback missing (warning), invalid command, clean package. Verify: tests green.

## 3. CLI routing and reference content

- [x] 3.1 [PIC-19][TDS-21.2] Route `type: presentation` manifests in `aesfw validate` to the presentation validator; support `--against <dir>`; non-zero exit on errors. Verify: CLI test.
- [x] 3.2 [PIC-19] `ref.tier.presentation`: manifest type `presentation`, add global `fallback` document, extend its test to assert validation passes. Verify: reference test green.

## 4. Catalogue and fixtures

- [x] 4.1 [VER-10.2] Add the six codes (stage `presentation`); invalid fixture per code; presentation branch in the catalogue cross-check. Verify: catalogue tests green.

## 5. Documentation and verification

- [x] 5.1 Run `pnpm trace`; PIC-19 traced. Verify: report.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`. Verify: green, no golden changed.
