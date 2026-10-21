# Proposal

## Why

Roadmap 08, M0 item 0.1 (`setup-workspace`, capability `foundation/workspace`, sources TDS-2, TDS-4.1, TDS-4.2, TDS-25, VER-15.3). The repository currently contains only the specification set (`docs/`), AGENTS.md, and OpenSpec planning files — no buildable code. Every later roadmap row needs a monorepo with enforced package boundaries, a strict TypeScript setup, and a runnable test/CI toolchain before the first line of simulation code exists (08 §2 strategy 1 and 5). This change is the root of the M0 dependency chain and lays the foundation for retiring R-01 (determinism), R-02 (boundary erosion, completed by `add-purity-and-boundary-guardrails`), and R-16 (agent drift, mitigated by a green, convention-enforcing workspace).

**Depends on:** none (first roadmap row; no archived dependencies required — the change list is empty, confirmed via `openspec list`).

## What Changes

- Create the pnpm workspace per TDS-4.1: root `package.json` (scripts only), `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js` (typescript-eslint flat config), Prettier configuration.
- Create all nine package stubs of TDS-4.2 with their declared names, purity roles, and dependency declarations, and no behavior: `@aesfw/core`, `@aesfw/content`, `@aesfw/app`, `@aesfw/protocol`, `@aesfw/testkit`, `@aesfw/host-web` (entry-point stubs `worker` and `client`), `@aesfw/host-node`, `@aesfw-ref/content`, `@aesfw-ref/client-web`.
- Configure the TypeScript build as project references (`tsc --build`), targeting ES2022 modules, with the strict flags of TDS-25 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`; `any` forbidden).
- Set up Vitest as the single test runner (Node mode now, browser mode configurable), fast-check as the property-testing dependency, and per-package coverage tooling (thresholds per VER-15.1 activate when a package ships features).
- Create the CI pipeline skeleton per VER-15.3: install (frozen lockfile) → format check → lint → type-check → tests, with the later stages (dependency-cruiser, coverage gates, property/scenario/determinism tests, client build and smoke, trace report) present as the pipeline structure and activated by their owning changes.
- Pin the toolchain: Node.js LTS ≥ 22, pnpm via corepack (TDS-2).
- Workspace scripts: `build`, `type-check`, `format`, `format:check`, `lint`, `test` (and `verify` aggregating what exists at this point).

## Capabilities

### New Capabilities

- `foundation/workspace`: the monorepo foundation — workspace layout and packages of TDS-4.2, TypeScript strict configuration and project-references build, toolchain commands, and the CI pipeline skeleton. This capability will grow only if later foundation rows add workspace-level requirements; all later rows (0.2–0.9, M1+) depend on it.

### Modified Capabilities

- None (no specs exist yet; `openspec list --specs` returns empty).

## Impact

- **Packages:** creates all nine packages of TDS-4.2 as empty stubs with `package.json` dependency declarations matching the "May depend on" column; no package ships behavior in this change.
- **Tick phases (02 §5.2):** none touched — no simulation code, no phase table yet (owned by `add-tick-pipeline-skeleton`).
- **Store kinds, commands, events, error codes, diagnostic codes:** none introduced (owned by later changes).
- **Root tooling:** new `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json` (solution file), `eslint.config.js`, `.prettierrc.json`, `.gitignore`, `.npmrc`, Vitest workspace config, `.github/workflows/ci.yml`.
- **Versioned algorithms, save format, protocol version, golden hashes:** untouched — not **BREAKING**, not **HASH-CHANGING** (no goldens exist).
- **CI:** the VER-15.3 pipeline skeleton lands in this change; dependency-cruiser and purity/theme-free lint gates are added by `add-purity-and-boundary-guardrails` (0.2), the trace gate by `add-traceability-tool` (0.8), and the browser determinism stage by `add-browser-determinism-check` (0.9).

### Out of scope

- `add-purity-and-boundary-guardrails` (0.2): dependency-cruiser rules, purity ESLint restrictions, theme-free lint, ambient-API traps, registry deep-freeze helper.
- `add-fixed-point-arithmetic` (0.3), `add-deterministic-primitives` (0.4), `add-world-state-model` (0.5), `add-tick-pipeline-skeleton` (0.6): all `@aesfw/core` behavior.
- `add-testkit-foundation` (0.7), `add-traceability-tool` (0.8), `add-browser-determinism-check` (0.9): testkit harnesses, trace tool, determinism matrix.
- `add-reference-content-seed` (2.7), `add-client-shell` (2.8): reference package content and the Vite client application (stubs compile but ship nothing).
- All M1+ rows: any simulation, content-pipeline, or host behavior.
