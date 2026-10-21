# Tasks

## 1. Runner and golden (design D1, D2, D3)

- [x] 1.1 Create `packages/testkit/src/browser/empty-world-runner.ts` with `runEmptyWorldCheckpoints` per design D2. Verify: `pnpm type-check` green.
- [x] 1.2 Create `packages/testkit/src/browser/empty-world.hashes.ts` with the committed `EMPTY_WORLD_HASHES` golden, generated from the Node run. Verify: the values are 16-hex-character strings.
- [x] 1.3 Create `packages/testkit/src/browser/empty-world-golden.test.ts` with the spec scenario `[VER-8.2][VER-9.4] the Node run matches the golden`, plus `[VER-8.2] the runner records the requested checkpoints` (10 checkpoints of 16 hex characters). Verify: green under `pnpm --filter @aesfw/testkit test`.

## 2. Browser project (design D1, D4)

- [x] 2.1 Create `packages/testkit/src/browser/determinism.browser.test.ts` with the spec scenario `[VER-8.2] Chromium reproduces the Node hashes`. Verify: type-checks; runs under `pnpm test:browser` where a browser is available.
- [x] 2.2 Create `vitest.browser.config.ts` per design D4; add `@vitest/browser` and `playwright` to root `devDependencies`; exclude `**/*.browser.test.ts` from the Node projects; add `vitest.browser.config.ts` to the ESLint ignores. Verify: `pnpm install` clean and `pnpm verify` green.

## 3. Scripts and CI (design D5)

- [x] 3.1 Add the root `test:browser` script. Verify: `pnpm test:browser --help` resolves (the run itself requires a browser).
- [x] 3.2 Add the browser-install and `pnpm test:browser` steps to `.github/workflows/ci.yml` after the unit tests, and note the nightly all-engines extension. Verify: the `[VER-15.3] CI runs the browser determinism stage` test passes.

## 4. Documentation

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: the M0 exit criteria line and row 0.9 are consistent.

## 5. Final verification

- [x] 5.1 Run `pnpm verify` (Node) on a clean checkout; all green, including the Node golden test. Run `pnpm test:browser` where a Chromium is available (CI or the build/verification box); document that the local Alpine container cannot launch the glibc browser build (design D6). [VER-8.2, VER-15.3]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.9 with "✓ archived <date>" in `docs/08`; M0 is then complete.
