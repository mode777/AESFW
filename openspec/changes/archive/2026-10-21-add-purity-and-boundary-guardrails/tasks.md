# Tasks

## 1. Dependency-cruiser guardrail (design D1)

- [x] 1.1 Add `dependency-cruiser` to root `devDependencies` at a pinned exact version; create `.dependency-cruiser.cjs` with rules named and mapped 1:1 to TDS-4.3 rules 1–5 (packages→reference/fixtures forbidden, core isolation, protocol isolation, reference-client visibility, pure→shell direction) plus rule 6 (entry-point-only imports; `@aesfw/core/testing` allowed only for `@aesfw/testkit` sources and test files); scope `paths` to `packages/**`, `reference/**`, `fixtures/**`; configure tsconfig-based resolution via the workspace `tsconfig.json`. Verify: `pnpm exec depcruise packages reference` exits 0 on the current stub graph.
- [x] 1.2 Add root scripts `depcruise` and extend `verify` to `format:check && lint && depcruise && type-check && test` (VER-15.3 order: lint → dependency-cruiser → type-check); activate the dependency-rules stage in `.github/workflows/ci.yml` at the placeholder left by 0.1. Verify: `pnpm depcruise` and `pnpm verify` both exit 0; the CI stage-check test from 0.1 still passes.
- [x] 1.3 Add `packages/testkit/src/dependency-rules.test.ts` with one test per spec scenario, each spawning depcruise against a temp tree with the violating import: `[TDS-4.3] packages importing reference are rejected`, `[TDS-4.3] packages importing fixtures are rejected`, `[TDS-4.3] core importing another package is rejected`, `[TDS-4.3] protocol importing another package is rejected`, `[TDS-4.3] reference client importing framework internals is rejected`, `[TDS-4.3] pure package importing a shell package is rejected`, `[TDS-4.3] deep source import is rejected`, `[TDS-4.3] core testing entry is allowed for testkit`, `[TDS-4.3] core testing entry is rejected elsewhere`, `[TDS-4.3] compliant dependency graph passes`; assert non-zero exit (or zero, for the allowed cases) and that the finding names the rule and file. Verify: `pnpm --filter @aesfw/testkit test` green.

## 2. ESLint purity rules (design D2)

- [x] 2.1 Extend `eslint.config.js` with an override for `packages/{core,content,protocol,app,testkit}/src/**/*.ts` excluding `*.test.ts`, adding the TDS-5.3 `no-restricted-globals`, `no-restricted-properties`, `no-restricted-syntax` (await/for-in/Promise/comparator-less sort/computed dynamic import/module-scope `let`), and `no-restricted-imports` sets per design D2. Verify: `pnpm lint` exits 0 on the current sources.
- [x] 2.2 Add `packages/testkit/src/purity-lint.test.ts` with one test per spec scenario, each linting a temp file containing the violation: `[TDS-5.3] clock and randomness APIs are rejected`, `[TDS-5.3] diagnostics and environment globals are rejected`, `[TDS-5.3] locale-dependent APIs are rejected`, `[TDS-5.3] kernel asynchrony is rejected`, `[TDS-5.3] comparator-less sort and for-in are rejected`, `[TDS-5.3] compliant pure-package source passes`; assert reported rule and file for violations, no findings for the compliant file. Verify: green under `pnpm --filter @aesfw/testkit test`.

## 3. Theme-free scanner (design D3)

- [x] 3.1 Create `tools/lint-theme-free.mjs` with the data-driven denylist module (seeded with `ref.` token pattern and codes P1, AK1, S1 from 07) scanning text files under `packages/**` and `fixtures/**` (excluding `dist`, `node_modules`, `coverage`, lockfiles), exempting `reference/**`; wire it into `pnpm lint` as `eslint . && node tools/lint-theme-free.mjs`. Verify: `pnpm lint` exits 0 on the current tree; the script reports a missing-directory scan as clean, not a crash.
- [x] 3.2 Add `packages/testkit/src/theme-free.test.ts` with one test per spec scenario against a temp tree: `[TDS-4.3] reference identifier literal in fixtures is rejected`, `[TDS-4.3] reference code literal in framework source is rejected`, `[TDS-4.3] theme-free fixture namespaces pass`, `[TDS-4.3] reference packages are exempt`; assert exit code and reported path/pattern. Verify: green under `pnpm --filter @aesfw/testkit test`.

## 4. Ambient-API traps (design D4)

- [x] 4.1 Create `tools/vitest.purity-setup.ts` replacing `Math.random`, `Date.now`, `performance.now`, and `crypto.getRandomValues` with throwing functions (host objects preserved); register it via `setupFiles` on exactly the `core`, `content`, `protocol`, `app`, and `testkit` projects in `vitest.config.ts`. Verify: `pnpm test` green across all projects, proving no Vitest internal is broken by the traps.
- [x] 4.2 Add one trap-assertion test per spec scenario in the respective package: `[TDS-5.5] Math.random throws in a core test` (`packages/core/src/traps.test.ts`), `[TDS-5.5] Date.now throws in a content test` (`packages/content/src/traps.test.ts`), `[TDS-5.5] performance.now throws in an app test` (`packages/app/src/traps.test.ts`), `[TDS-5.5] crypto.getRandomValues throws in a protocol test` (`packages/protocol/src/traps.test.ts`); each asserts the call throws. Verify: green under `pnpm test`.

## 5. Deep-freeze helper and tsconfig pinning (design D5, D6)

- [x] 5.1 Create `packages/core/src/testing.ts` exporting `deepFreeze` (recursive over plain objects and arrays, returns the input reference, zero dependencies), add the `./testing` export to `@aesfw/core`'s package exports map, and confirm `depcruise` resolves the entry for the testkit exception. Verify: `pnpm type-check` and `pnpm depcruise` green.
- [x] 5.2 Add `packages/core/src/testing.test.ts` with one test per spec scenario: `[TDS-5.2][TDS-5.5] deep freeze covers nested levels` (root and two nested levels report frozen on a `{ a: { b: { c: 1 } } }` graph), `[TDS-5.2][TDS-5.5] mutating a frozen nested property throws` (TypeError, value unchanged). Verify: green under `pnpm --filter @aesfw/core test`.
- [x] 5.3 Add `"types": []` to the tsconfigs of the five pure packages (design D6, TDS-5.5 row 1). Verify: `pnpm type-check` green and the existing `[TDS-25]` no-DOM/no-Node typings test still passes.

## 6. Documentation

- [x] 6.1 Apply amendment A-01 from design.md: add the `deepFreeze` line and its explanatory sentence to the TDS-10.3 test API code block in `docs/05_Technical_Design_Specification.md`. Verify: the block shows `deepFreeze<T>(value: T): T;` with the roadmap-0.2 provenance sentence.
- [x] 6.2 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes discovered during implementation; expected: none (mark the row done only at archive). Verify: roadmap rows 0.3–0.9 dependency column still accurate.

## 7. Final verification

- [x] 7.1 Run `pnpm verify` (now including `depcruise`) and all guardrail tests on a clean checkout; all green. `pnpm trace` is introduced by `add-traceability-tool` (0.8) and is not runnable yet — note its absence instead of substituting an ad-hoc check; no new requirement IDs in `docs/` sections were claimed beyond A-01. [TDS-4.3, TDS-5, VER-15.3]

## Workflow follow-up

- Run `/opsx-verify` on this change, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.2 with "✓ archived <date>" in `docs/08` and confirm rows 0.3–0.9 become unblocked.
