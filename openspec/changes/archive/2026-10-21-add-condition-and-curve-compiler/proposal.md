# Proposal

## Why

Roadmap 08, M1 item 1.6 (`add-condition-and-curve-compiler`, capability `content/conditions`, size M). Content references conditions and curves (recipes, growth policies, satisfaction curves), so the pipeline must compile and type-check the expression language and the curve types of CONT-7 and CONT-8. This row delivers the typed tree, the evaluator, and the curves the population and production rows consume, retiring R-05. Depends on: `add-registry-compilation` (1.4) — archived 2026-10-21.

## What Changes

- Add the `conditions` and `curves` definition collections and their TypeBox schemas (CONT-7, CONT-8) to `content/schemas`.
- Add `content/conditions`: the `Expr` tree of TDS-14.1, `compileCondition` with compile-time type checking and diagnostics, the pure evaluator `evaluate(expr, context)`, the curve compiler and evaluator (constant, piecewise-linear, step, lookup; `clamp`/`linear`/`error` extrapolation), and the domain-query table of TDS-14.2 with the initial query set (no `sustained`).
- Add `compileExpressions(definitions, registry)` and wire it into `loadContent` so invalid conditions and curves surface at load time (TDS-20.2 step 7).
- Add unit and property tests for every operator, type error, curve type, and extrapolation policy.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `content/conditions`: the condition expression language compiler and evaluator, the domain-query table, and the curve compiler and evaluator.

### Modified Capabilities

- `content/schemas`: adds the `conditions` and `curves` collections and their schemas.
- `content/registry`: `loadContent` also compiles conditions and curves.

## Impact

- **Packages:** `@aesfw/content` gains `src/conditions/**`; `src/schemas/**` gains the condition and curve schemas and catalogue entries; `src/registry/load.ts` calls `compileExpressions`. No new runtime dependency is added.
- **Tick phases:** none yet (phase 22 evaluates `sustained` timers in `add-sustained-conditions`, 7.1). **Store kinds:** none. **Commands/events/error codes:** none.
- **Diagnostic codes:** `condition_type_error`, `unknown_operator`, `unknown_query`, `invalid_condition_shape`, `invalid_curve`, `curve_extrapolation_error`.
- **Out of scope:** `sustained` timers and phase 22 (`add-sustained-conditions`, 7.1); the concrete domain-query implementations that read simulation state (`sim/population`, `sim/needs`, `sim/economy`); graph validation (10.1); determinism validation (10.4).
- **Verification impact:** `pnpm test` gains condition/curve unit and property tests; the new diagnostic codes get fixtures in this change.
