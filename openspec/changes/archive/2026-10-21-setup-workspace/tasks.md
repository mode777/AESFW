# Tasks

## 1. Root workspace configuration

- [x] 1.1 Create root `package.json` (scripts only, `"private": true`, `packageManager: pnpm@10.x` exact pin, `engines.node ">=22"`) and `pnpm-workspace.yaml` covering `packages/*` and `reference/*`; verify `corepack enable && pnpm install` resolves the pinned pnpm and an empty workspace without errors. [TDS-2]
- [x] 1.2 Create `tsconfig.base.json` (TDS-25 flags: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`; `target: es2022`, `module`/`moduleResolution: nodenext`, `composite`-ready) and root solution `tsconfig.json` referencing all package projects; verify `pnpm type-check` (tsc --build) exits 0 on the empty workspace. [TDS-2, TDS-25]
- [x] 1.3 Add Prettier config, ESLint flat config (`typescript-eslint` recommended-type-checked, `no-explicit-any` error, `eslint-config-prettier`), `.gitignore` (node_modules, dist, *.tsbuildinfo, coverage), and root scripts `build`, `type-check`, `format`, `format:check`, `lint`, `test`, `verify` (= `format:check && lint && type-check && test`); verify `pnpm format:check` and `pnpm lint` exit 0 with no files to lint failing. [TDS-2, TDS-25]

## 2. Package stubs (TDS-4.2)

- [x] 2.1 Scaffold the five pure framework packages `@aesfw/core`, `@aesfw/content`, `@aesfw/protocol`, `@aesfw/app`, `@aesfw/testkit`: `package.json` (`type: module`, exports, permitted deps only — `yaml`/TypeBox declared in `content`, `fast-check` in `testkit`, others zero runtime deps), `tsconfig.json` extending base without DOM/Node typings, `src/index.ts` with a minimal typed export; verify each package type-checks and resolves by name. [TDS-4.2, TDS-4.3]
- [x] 2.2 Scaffold the shell framework packages `@aesfw/host-web` (entry points `./worker` and `./client` behind an exports map, `./client` declared with protocol-only dependency) and `@aesfw/host-node` (permitted deps per TDS-4.2), each with a minimal typed entry; verify both entry points resolve from a workspace consumer. [TDS-4.2]
- [x] 2.3 Scaffold the reference packages `@aesfw-ref/content` (data-only manifest, no build step) and `@aesfw-ref/client-web` (framework deps limited to `@aesfw/protocol` and `@aesfw/host-web/client`); verify manifests and resolution. [TDS-4.2]
- [x] 2.4 Add workspace-structure unit tests in `@aesfw/testkit` covering the spec scenarios, one test per scenario title with requirement tags: `[TDS-4.1][TDS-4.2] all nine packages resolve and no others exist`, `[TDS-4.2] host-web exposes worker and client entry points`, `[TDS-4.2][TDS-4.3] core declares zero runtime dependencies`, `[TDS-4.2][TDS-4.3] pure packages declare no shell or reference dependencies`, `[TDS-4.2][TDS-4.3] reference client declares only permitted framework sources`; verify `pnpm test` runs them green. [TDS-4.1, TDS-4.2, TDS-4.3]

## 3. Test tooling

- [x] 3.1 Set up the Vitest workspace (per-package projects, Node environment) with fast-check available where declared, and wire the v8 coverage provider without threshold blocks (thresholds land with first package features, design D-WS-6); add a smoke test in one package so `pnpm test` demonstrably collects projects; verify `pnpm test` exits 0 across all packages. [TDS-2, VER-15.3]
- [x] 3.2 Add tests for the build/toolchain scenarios: `[TDS-25] every package tsconfig extends the base without reverting strict flags`, `[TDS-25] pure packages compile without DOM, WebWorker, or node typings`, `[VER-15.3] test command reaches every package project`; verify green under `pnpm test`. [TDS-25, VER-15.3]
- [x] 3.3 Add a negative-check test `[TDS-2][VER-15.3] format check rejects unformatted source` (temp file fixture, assert non-zero exit and reported filename, cleaned up afterwards); verify it passes. [TDS-2, VER-15.3]

## 4. CI pipeline skeleton

- [x] 4.1 Create `.github/workflows/ci.yml` with ordered stages per VER-15.3: install (`pnpm install --frozen-lockfile` via corepack) → format check → lint → type-check → test, with commented placeholders naming the owning change for later stages (dependency rules → 0.2, coverage gates/property/scenario/determinism → 0.3–0.9, trace → 0.8) and triggers on push/PR; verify locally with `act`-equivalent dry run or by pushing to a scratch branch and observing green stages in order. [VER-15.3]
- [x] 4.2 Create `.github/workflows/nightly.yml` stub containing only currently available stages (per design D-WS-8) and a CI check `[VER-15.3] workflow stages appear in VER-15.3 order with frozen-lockfile install` asserting stage order from the workflow file; verify green. [VER-15.3]

## 5. Documentation and toolchain pinning checks

- [x] 5.1 Add tests `[TDS-2] corepack activates the pinned pnpm version` (assert `pnpm --version` output equals the `packageManager` declaration) and `[TDS-2] engines rejects Node below 22` (assert the declared range); skip-gracefully with a logged reason if the executing environment cannot pin Node, so the test documents rather than flakes. [TDS-2]
- [x] 5.2 Review the implemented workspace against docs/01–08 for clarifications or amendments discovered during implementation (expected: none); if any were found, record them in design.md and apply the document edits in this change; verify docs are untouched or edits are recorded per 05 §26. [TDS-26]

## 6. Final verification

- [x] 6.1 On a clean checkout: `corepack enable && pnpm install && pnpm verify`; all stages green, no package skipped, and the spec scenarios of `foundation/workspace` each covered by a passing tagged test. `pnpm trace` is introduced by `add-traceability-tool` (0.8) and is explicitly not runnable yet; note its absence instead of substituting an ad-hoc check. [TDS-2, VER-15.3]
