# Design

## Context

Greenfield workspace: the repository holds only `docs/`, `AGENTS.md`, `README.md`, `.github/` (OpenSpec prompts), and `openspec/`. Nothing builds yet. All technical choices that matter here are already fixed by TDS-2 (toolchain), TDS-4.1/4.2/4.3 (layout, packages, dependency rules), and TDS-25 (conventions); see proposal.md for motivation. This change creates the skeleton those sections describe and records only decisions TDS leaves open.

## Goals / Non-Goals

**Goals:**

- A fresh checkout reaches `pnpm verify` green with exactly one documented toolchain path (corepack → pnpm → tsc/vitest).
- Every TDS-4.2 package exists, resolves by name, and declares its permitted dependencies, so later rows only add code, never scaffolding.
- The CI pipeline mirrors VER-15.3's stage order from day one, so later changes insert gates instead of restructuring the pipeline.

**Non-Goals:**

- Any purity, theme-freedom, or dependency-cruiser enforcement (`add-purity-and-boundary-guardrails`).
- Any runtime behavior in any package (`add-fixed-point-arithmetic` and later).
- `fixtures/` and `tools/` directories — created by their owning changes (`add-testkit-content-builders`/M1, `add-traceability-tool`), not as empty scaffolding here.
- Vite app for the client, Playwright, TypeBox, and `yaml` dependencies beyond what stubs need to declare (`add-client-shell`, M1 rows).

## Decisions

- **D-WS-1 Module resolution: `nodenext`, not `bundler`, in the base config.** TDS-2 fixes target ES2022 ESM and libraries that ship ESM + `.d.ts`. `host-node` dist must run under plain Node, which requires extension-correct relative imports; `nodenext` enforces that at author time. Vite (from `add-client-shell` on) consumes sources regardless. Alternative rejected: `moduleResolution: bundler` everywhere — nicer authoring, but breaks direct Node execution of built CLI output.
- **D-WS-2 Toolchain pinning via `packageManager` + `engines`.** Root `package.json` sets `packageManager: pnpm@10.x` (exact patch pinned) and `engines.node: ">=22"`. Alternatives considered: Volta, `.nvmrc` alone — both machine-local; corepack is the TDS-2 choice and needs nothing else.
- **D-WS-3 Stub shape.** Each package: `package.json` (`"type": "module"`, `exports` map), `tsconfig.json` extending `tsconfig.base.json`, `src/index.ts` with a minimal typed export, no behavior. `@aesfw/host-web` gets two entry files (`src/worker/index.ts`, `src/client/index.ts`) behind its exports map per TDS-4.2. `@aesfw-ref/content` is a data-only package: manifest plus an empty `content/` tree placeholder, no build step.
- **D-WS-4 `fast-check` placement.** Declared as a runtime dependency of `@aesfw/testkit` (TDS-4.2) and as a devDependency of packages whose tests will use it (`core`, `app` from their property-test changes on). Dev dependencies do not violate the zero-runtime-dependency rule of TDS-4.2.
- **D-WS-5 `verify` script is staged.** AGENTS.md's end-state `pnpm verify` (format check, lint, dependency rules, type-check, tests) cannot include dependency rules before 0.2. This change ships `verify = format:check → lint → type-check → test`; `add-purity-and-boundary-guardrails` inserts `lint:deps` (dependency-cruiser) after `lint`. No AGENTS.md change needed — its list describes the steady state.
- **D-WS-6 Coverage thresholds activate with features.** Vitest v8 coverage is wired now, but VER-15.1 thresholds are enforced "from the milestone in which the package first ships features" (06 §15.1): stub packages have no statements, so threshold blocks are added by the changes that first ship package code (0.3+ for `core`, etc.). Configuring dead thresholds now would either fail or be meaningless.
- **D-WS-7 ESLint scope is baseline-only.** typescript-eslint flat config (`recommended-type-checked`) plus `eslint-config-prettier`; `no-explicit-any` as error (TDS-25). Purity globals/syntax restrictions and theme-free lint are 0.2 scope and will extend this config.
- **D-WS-9 Workspace-structure tests live in `@aesfw/testkit`.** The cross-package checks of `foundation/workspace` (inventory, manifests, entry points, config inheritance) run as Vitest tests inside the test-infrastructure package rather than a new root test directory, keeping the TDS-4.1 layout canonical. Test code may read manifest files (purity constrains package source, not tests).
- **D-WS-8 CI structure.** One GitHub Actions workflow with a job per VER-15.3 stage group, strictly ordered: install (`--frozen-lockfile`) → format → lint → type-check → test. Stages owned by later changes are documented in the workflow as comments naming the owning change, not present as failing steps. A `nightly` workflow stub exists (VER-15.3 nightly line) with only the currently available stages.

**Tick phases, system modules, store reads/writes:** none — this change introduces no simulation code, so there are no allocation, ordering, or rounding rules to state. No amendments to 01–07 are required; no golden hashes exist.

## Risks / Trade-offs

- [corepack/pnpm version drift between machines] → exact `packageManager` pin; CI installs via corepack so drift fails loudly in PRs.
- [Vitest project-references interplay (source imports across packages during tests)] → packages import each other via workspace names pointing at built `dist` + `.d.ts` for `type-check`, while Vitest resolves workspace source through its aliases; verify both paths in the stub phase so later rows never fight the runner.
- [nodenext strictness annoys later rows (explicit `.js` extensions)] → accepted cost; it is what guarantees Node-runnable ESM output (D-WS-1).
- [Empty `verify` accretes ad-hoc scripts instead of the VER-15.3 pipeline] → stage order fixed now (D-WS-8); each later change adds its gate in the marked position.

## Migration Plan

Not applicable (greenfield). Rollback: revert the single change commit; no data or external systems are affected.

## Open Questions

None. The pnpm minor version is pinned to the current stable 10.x line at implementation time and updated by later changes like any dependency bump.
