# Proposal

## Why

Roadmap 08, M0 item 0.2 (`add-purity-and-boundary-guardrails`, capability `foundation/purity`, size S). The walking skeleton now exists, but nothing rejects a forbidden import, an ambient API call, or game terminology leaking into the framework — the exact erosion modes of risk R-02 (framework/reference boundary erodes; game terminology leaks into the framework), with automated guardrails also backing R-16 (agent-driven implementation drifts from the specification). Per the strategy "boundaries from day one" (08 §2.5), these rules must be enforced by tooling before the first line of simulation code lands in M1. Depends on: `setup-workspace` (0.1) — archived 2026-10-21.

## What Changes

- Add `.dependency-cruiser.cjs` (TDS-4.1 layout) enforcing the TDS-4.3 rules 1–6: no `packages/**` → `reference/**`/`fixtures/**` imports, `@aesfw/core` and `@aesfw/protocol` import no other package, `reference/client-web` sees only protocol DTOs plus `@aesfw/host-web/client`, pure packages never import shell packages, cross-package imports use package entry points only (with the `@aesfw/core/testing` exception for `@aesfw/testkit` and tests), and a `pnpm` script plus the CI stage named by 0.1's placeholders (VER-15.3 order: lint → dependency-cruiser).
- Extend `eslint.config.js` with purity rules for pure packages (TDS-5.3, TDS-5.5): `no-restricted-globals`, `no-restricted-properties`, and `no-restricted-syntax` covering the forbidden ambient APIs, `for…in`, and comparator-less `Array.prototype.sort`; `no-restricted-imports` for shell sources in pure packages.
- Add a theme-free lint check (TDS-4.3 rule 7): a literal-pattern rule failing when framework source or framework fixtures contain reference IDs (`ref.`), reference codes (P1, AK1, S1, …), or setting terminology.
- Add ambient-API traps (TDS-5.5): a Vitest setup file for pure-package test projects replacing `Math.random`, `Date.now`, `performance.now`, and `crypto.getRandomValues` with functions that throw, so hidden ambient reads fail loudly inside tests.
- Add a registry deep-freeze helper (TDS-5.2, TDS-5.5): a small `deepFreeze` export in `@aesfw/core` (zero dependencies) that deeply freezes an object graph, for use by test builds; wiring it to the compiled `Registry` type arrives with `add-registry-compilation` (1.4).
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no world state, save format, or goldens exist yet).

## Capabilities

### New Capabilities

- `foundation/purity`: the automated purity and boundary guardrails — dependency rules between packages, restricted globals/properties/syntax in pure packages, theme-freedom of framework source and fixtures, ambient-API traps in pure-package test runs, and the deep-freeze helper — as observable failures of the enforcement tooling.

### Modified Capabilities

- None. `foundation/workspace` requirements are unchanged; this change only fills the CI stage placeholders that 0.1 left commented for 0.2.

## Impact

- **Tooling/config:** `eslint.config.js` (new rule blocks), new `.dependency-cruiser.cjs`, new Vitest setup file for pure packages, root `package.json` scripts (`lint` extension plus a dedicated dependency-cruiser script wired into `verify`), `.github/workflows/ci.yml` (activate the dependency-rules stage owned by this change per VER-15.3).
- **Dependencies:** `dependency-cruiser` added as a root devDependency only; pure packages gain no runtime dependencies (05 §27 satisfied — `@aesfw/core` stays at zero).
- **Packages:** `@aesfw/core` gains one new test-support export (the deep-freeze helper); all other packages are affected only as subjects of the new rules.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none. **Diagnostic codes:** none (violations surface as lint/dependency-cruiser findings and thrown `TypeError`s from frozen structures in test builds, not as simulation diagnostics).
- **Verification impact:** `pnpm lint` becomes purity- and theme-aware; a new dependency-rules stage appears in CI in VER-15.3 position; negative-fixture tests in `@aesfw/testkit` prove each guardrail rejects a violating sample.
