# Design

## Context

The pipeline validates raw documents per package (`parseFiles` → `validateSchemas`) before composition. Determinism checks need package attribution (module overrides) and must see expressions before the compiler's unknown-operator errors mask them, so the stage runs right after schema validation, over the raw per-file documents.

## Goals / Non-Goals

- Goals: reject the five content-expressible nondeterminism vectors with package/file attribution.
- Non-Goals: runtime determinism machinery (already enforced by `fx`, canonical encoding, purity lint); order-dependence analysis (see D3).

## Decisions

### D1 — Stage placement and shape

`validateDeterminism(files: readonly RawFile[], packages: readonly ManifestInfo[]): readonly Diagnostic[]` called in `loadContent` after `validateSchemas` and before `composeDefinitions`. It re-walks each file's already-validated raw documents (no second parse). `RawFile` is the existing `ParsedFile` shape (`package`, `path`, `document`); package types come from the resolved manifests.

### D2 — Scans

- **Numeric scan**: walk every JSON value of every raw document; `typeof === 'number'` must satisfy `Number.isSafeInteger`, else `platform_numeric` with path. Booleans/strings untouched; `-0` is a safe integer.
- **Expression scans**: walk condition definitions' `expression` values. A single-key record whose key is in the wall-clock list → `wall_clock_expression`; in the random list → `unseeded_random`. Any string value containing `=>`, `function`, `eval(`, or `new Date` → `executable_script`. Both scans recurse arrays/records; only `conditions` definitions are walked (curves are numeric tables, covered by the numeric scan).
- **Module overrides**: for each manifest with `type: 'optional_module'`, every definition ID that starts with `framework.` or equals any ID declared by a `simulation_content` package in the load → `module_redefines_core`.

### D3 — Order-dependent queries

Not content-expressible: the runtime evaluates aggregate queries in ascending entity ID (05 §9 total-order rule), so no authored query can depend on evaluation order. The catalogue documents this; no diagnostic exists. Recorded as the CONT-11.8 bullet's v1 interpretation.

### D4 — Severity

All five codes are errors ("Reject", CONT-11.8) and fail the load like any other stage. They are not severity-knobbed.

## Golden-hash statement

No golden changes: shipped fixtures contain only safe integers and known operators. (06 §9.4)
