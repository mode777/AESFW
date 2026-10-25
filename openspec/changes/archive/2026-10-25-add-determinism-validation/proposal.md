# Proposal

## Why

Roadmap 08, M10 item 10.4 (`add-determinism-validation`), size S. R-01 (determinism breaks in JavaScript) is guarded by `fx`, canonical encoding, and the engine matrix, but nothing rejects *content* that would inject nondeterminism: wall-clock expressions, unseeded randomness, platform-dependent floats, or optional modules that redefine core definitions (CONT-11.8). This row closes the content side of R-01 and R-15's containment story (13.1 builds on it).

Dependencies on archived changes: 1.6 `add-condition-and-curve-compiler` (archived 2026-10-21). Archived.

## What Changes

- A new `determinism.ts` validation over raw definition documents per package file, run in `loadContent` before composition (it needs package attribution), reporting **error**-severity diagnostics:
  - `wall_clock_expression`: a condition expression uses a wall-clock operator (`now`, `date`, `time`, `clock`).
  - `unseeded_random`: a condition expression uses a random operator (`random`, `rng`, `randint`).
  - `platform_numeric`: any definition number that is not a safe integer (floats, NaN, infinities).
  - `executable_script`: a string inside a condition expression that looks like executable code (`=>`, `function`, `eval(`, `new Date`).
  - `module_redefines_core`: an `optional_module` package defines an ID from the `framework.` namespace or an ID already defined by a non-module package in the same load.
- CONT-11.8's "order-dependent queries without stable ordering" has no content-expressible form (aggregates iterate ascending entity ID by construction, ARCH-5.4/05 §9); recorded as not-applicable-by-construction in the design, with the catalogue entry documenting it.
- Catalogue grows by the five codes; one invalid fixture per code.

## Capabilities

### Modified Capabilities

- `content/validation`: the determinism requirements extend the validation stage.

## Impact

- **Packages:** `@aesfw/content` (new `validation/determinism.ts`, catalogue entries, `loadContent` wiring); fixtures only otherwise. No client, host, or protocol change.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none new.
- **Diagnostic codes (new, error severity):** `wall_clock_expression`, `unseeded_random`, `platform_numeric`, `executable_script`, `module_redefines_core`.
- **HASH-CHANGING:** no golden changes (all shipped fixtures are deterministic content).
- **Traceability:** CONT-11.8 moves from untraced to traced.

## Out of Scope

- 13.1 `add-module-framework` (consumes `module_redefines_core`); 10.5 `add-presentation-package-validation`; 10.6 `add-validation-report-cli`.
