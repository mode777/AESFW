# Proposal

## Why

Roadmap 08, M10 item 10.3 (`add-design-intent-diagnostics`), size M. CONT-11.7 defines ten checks that report whether the core design ideas of the GDD are active in a content package — the seven scarcities of GDD-3.2, self-sufficiency, cross-region dependency, pyramid integrity, breadth/depth, coverage, idle costs, decline asymmetry, bounded trade, and ratio legibility. Without them, nothing tells a content author that their package silently omitted the tensions the framework exists to express (R-14, R-08's content side). M11a's reference prototype gate (06 §10.3) promotes these to errors in CI, so the machinery must exist now.

Dependencies on archived changes: 10.1 `add-graph-validation` (archived 2026-10-25). Archived.

## What Changes

- A new `design-intent.ts` check in the validation stage emitting the ten CONT-11.7 diagnostics, all warning severity when enabled.
- A `LoadOptions.design_intent: 'off' | 'warning' | 'error'` knob, default `'off'` (see design D1): hosts opt in; severity is warning unless promoted, and promotion fails the load. This owns CONT-11.7's "warnings … may be promoted to errors for complete-game packages"; the M11 reference-content gate will load with `'error'`.
- The seven-scarcity audit of GDD-3.2 as one diagnostic listing the inactive scarcities, plus nine single-idea diagnostics.
- Fixture convention per 06 §10.2: one invalid fixture per code under `fixtures/content/invalid/`, plus one valid fixture package under `fixtures/content/valid/design-intent/` that activates every idea and asserts zero findings (the false-positive guard).

## Capabilities

### Modified Capabilities

- `content/validation`: the design-intent requirements extend the validation stage.

## Impact

- **Packages:** `@aesfw/content` (new `validation/design-intent.ts`, catalogue entries, `LoadOptions` field); fixtures only otherwise. No client, host, or protocol change.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none new.
- **Diagnostic codes (new, warning severity when enabled):** `inactive_scarcities`, `self_sufficient_region`, `cross_region_absent`, `pyramid_bypass`, `breadth_depth_collapse`, `coverage_absent`, `idle_cost_absent`, `decline_symmetric`, `unbounded_trade`, `ratio_illegible`.
- **HASH-CHANGING:** no golden changes (default `'off'`; every load path in tests and CI is unchanged).
- **Traceability:** CONT-11.7 and GDD-3.2 move from untraced to traced.

## Out of Scope

- 10.4 `add-determinism-validation` (CONT-11.8), 10.5 `add-presentation-package-validation` (PIC-19), 10.6 `add-validation-report-cli` (CONT-15).
- The M11 CI gate itself (`@aesfw-ref/content` strict load with promotion) — that lands with the reference-content rows.
