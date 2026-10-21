# Design — add-purity-and-boundary-guardrails

## Context

`setup-workspace` (0.1, archived) scaffolded the nine packages, the strict TypeScript build, ESLint (type-checked, `no-explicit-any`), the Vitest workspace (Node environment, per-package projects), and a CI skeleton whose dependency-rules stage is a commented placeholder naming this change (VER-15.3 order). No simulation code, no `fixtures/`, no `tools/` exist yet. What the guardrails must enforce is fully fixed by TDS-4.3 (dependency rules), TDS-5.3 (forbidden list), and TDS-5.5 (enforcement table); see proposal.md for motivation. This document records only the choices TDS leaves open.

## Goals / Non-Goals

**Goals:** every TDS-4.3 and TDS-5.3 rule has a tool that fails loudly with a named rule and file; the failures are exercised by negative-fixture tests so the guardrails themselves cannot silently rot; `@aesfw/core` stays at zero runtime dependencies.

**Non-Goals:** the clone-and-compare/double-run behavioral purity harnesses (TDS-5.5 last row → `add-testkit-foundation`, 0.7); the `Registry` type and wiring the freeze helper into compiled registries (`add-registry-compilation`, 1.4); write-set checks (`add-tick-pipeline-skeleton`, 0.6); browser-mode trap parity (`add-browser-determinism-check`, 0.9); content-level validation diagnostics (M1/M10); mutation testing (VER-15.2, M12); trace tooling (0.8).

## Decisions

### D1 — Dependency check: dependency-cruiser, config `.dependency-cruiser.cjs`, script `depcruise`

TDS-4.3 names dependency-cruiser; the config path is fixed by the TDS-4.1 layout. New root devDependency at a pinned exact version; root script `pnpm depcruise`; `pnpm verify` becomes `format:check && lint && depcruise && type-check && test`, matching the VER-15.3 stage order (lint → dependency-cruiser → type-check). CI stage inserted at the placeholder from 0.1. Scanned paths: `packages/**`, `reference/**`, `fixtures/**` TS/JS modules (`fixtures` joins the scan roots once the directory exists; depcruise errors on missing roots, so the script starts as `depcruise packages reference`); `tools/**` is exempt (repository tooling may read everything by design). Rules map 1:1 to TDS-4.3 rules 1–5 plus rule 6 (entry-point-only imports, with the `@aesfw/core/testing` exception for `@aesfw/testkit` sources and test files), each with `name` and `severity: error` so findings identify the violated rule. Resolution is exports-map based, not tsconfig based: empirical probing showed bare specifiers resolve only with `enhancedResolveOptions.exportsFields: ['exports']` plus `conditionNames: ['node','import','types','default']` (the workspace tsconfig has no path aliases to offer), entry specifiers resolve to `dist/`, and non-exported subpaths stay unresolved "phantom" modules whose path is the raw specifier — so rule 6 is enforced twice, on the specifier (catching phantoms) and on the resolved file (catching relative deep imports). Rule 7 (theme-free) is not a dependency rule; it is D3. Alternative considered: hand-rolled import scanner — rejected, TDS names the tool and dependency-cruiser resolves TS paths via the workspace tsconfig.

### D2 — ESLint purity block: one override for pure-package sources

Single `eslint.config.js` override block scoped to `packages/{core,content,protocol,app,testkit}/src/**/*.ts`, excluding `*.test.ts` (tests must be able to reference trapped APIs to assert they throw; the runtime nets are the traps, D4). Mapping of TDS-5.3 to rules:

- `no-restricted-globals`: `Date`, `performance`, `setTimeout`, `setInterval`, `queueMicrotask`, `requestAnimationFrame`, `console`, `Intl`, `globalThis`, `window`, `self`, `process`, `fetch`, `crypto` (TDS forbids all of `crypto.*`).
- `no-restricted-properties`: `Math.random`, `Date.now`, `Date.parse`, `crypto.getRandomValues`, plus `'*'.toLocaleString` and `'*'.localeCompare`.
- `no-restricted-syntax`: `AwaitExpression`, `ForInStatement`, `NewExpression[callee.name='Promise']`, zero-argument member `.sort()` calls, dynamic `import()` whose specifier is not a string literal, and module-scope `let` declarations (`Program > VariableDeclaration[kind='let']`) as the static check for TDS-5.3 module-level mutable state.
- `no-restricted-imports`: deep `src/` imports of other workspace packages and any shell-package import (belt to dependency-cruiser's braces; dependency-cruiser remains authoritative, D1).

Alternative considered: linting tests too — rejected, it would forbid the trap-assertion tests themselves.

### D3 — Theme-free check: standalone text scanner run inside `lint`

A small script `tools/lint-theme-free.mjs` scans every text file under `packages/**` and `fixtures/**` (excluding `dist`, `node_modules`, `coverage`, lockfiles) for (a) the token pattern `ref.` followed by an identifier character, and (b) a data-driven denylist of reference codes, seeded with the codes 07 enumerates today (P1, AK1, S1) and extended by the change that adds each new code. Word-boundary, case-sensitive matching; no allow-marker mechanism until a real false positive appears. `reference/**` is exempt. `pnpm lint` runs `eslint . && node tools/lint-theme-free.mjs`, keeping VER-15.3's "lint (incl. purity and theme-free rules)" as one stage. Alternative considered: a custom ESLint rule — rejected, ESLint does not process YAML fixtures, so a second mechanism would exist anyway. Known limit: mechanical "setting terminology" detection stays limited to the denylist; wording-level review remains human (recorded under Risks).

### D4 — Ambient-API traps: shared Vitest setup file for the five pure projects

`tools/vitest.purity-setup.ts` replaces `Math.random`, `Date.now`, and `crypto.getRandomValues` on the environment globals with functions that throw, registered via `setupFiles` only on the `core`, `content`, `protocol`, `app`, and `testkit` projects in `vitest.config.ts`. Vitest's worker reads `performance.now` itself (environment, module, and dynamic-import timing), so an unconditional replacement breaks the runner; the risk below materialized during implementation and the chosen resolution keeps the trap but discriminates by immediate caller: the stack frame directly above the trap (under `node_modules` for vitest, vite-node, and tinypool reads) returns the real duration, every other call throws. Shell and reference projects keep stock globals. The file is authored so 0.9 can reuse it for browser mode.

### D5 — Deep-freeze helper lives in the `@aesfw/core/testing` entry

TDS-10.1 fixes the public API and does not include a freeze helper; TDS-4.4 already reserves `testing.ts` as core's test-only entry and TDS-4.3 rule 6 already names the `@aesfw/core/testing` exception, so the helper ships as `deepFreeze` in `packages/core/src/testing.ts` behind a `./testing` export. The dependency-cruiser exception of D1 is therefore exercisable from day one. When 0.6/0.7 add `runPhases`/`stores`/`phaseTable`, they extend the same entry. `deepFreeze` is recursive over plain objects and arrays, returns the input reference, and relies on strict-mode ESM to turn writes into `TypeError`s. Alternative considered: export from the main index — rejected, it would add an API outside the TDS-10.1 list.

### D6 — Pure-package tsconfigs pin `"types": []`

TDS-5.5 row 1 makes the type-level surface part of purity enforcement; today it only holds because `@types/*` packages happen to be absent. The five pure packages' tsconfigs get `"types": []` so auto-included type packages can never reintroduce DOM/Node globals; the existing `[TDS-25]` no-DOM/no-Node test from 0.1 keeps guarding the `lib` side. Host and reference tsconfigs are untouched (they own their environments).

## Amendments and clarifications to 01–07

- **A-01 (clarification, additive):** TDS-10.3 test API code block gains one line `deepFreeze<T>(value: T): T; // deep-freeze definition data for test builds` with a sentence: exported from `@aesfw/core/testing` from roadmap row 0.2 onward; the registry deep freeze of TDS-5.2/5.5 uses it. No other document changes; no conflicts with 01–04 were found.

## Risks / Trade-offs

- [dependency-cruiser mis-resolves workspace paths or entry-point exports] → configure it with the workspace `tsconfig.json` (`tsConfig.fileName`) and validate against the current stub graph in the first task; the negative-fixture tests fail loudly if resolution breaks.
- [Trapped `performance.now`/`Date.now` breaks a Vitest internal in the worker] → materialized for `performance.now` (vitest reads it for environment, module, and import timing); resolved inside D4 by caller discrimination — tooling frames under `node_modules` pass through, source frames throw. `Math.random` and `Date.now` turned out to be unread by vitest and stay unconditionally trapped.
- [Theme-free regex false positives as content grows] → denylist is data-driven and narrow (`ref.` token + explicit codes); refinements ship with the change that adds the offending code, per 06 fixture policy.
- [Static lint cannot see aliased `sort` or `let` exported bindings] → accepted static limit; the clone-and-compare and double-run harnesses (0.7) are the behavioral net named by TDS-5.5.
- [`pnpm verify` grows a stage, slowing feedback] → dependency-cruiser on the stub graph is sub-second; revisit only if bench budgets (VER-14) ever say otherwise.

## Migration Plan

Config-only change on the stub workspace; no data, save, protocol, or golden artifacts exist. Rollback is reverting the tooling commits. The only ordering constraint: dependency-cruiser must pass on the existing graph before the CI stage goes blocking, else the pipeline reddens for reasons unrelated to new work.

## Open Questions

None blocking. The reference-code denylist growth policy (extend per adding change) is recorded in D3 and applied by later rows.
