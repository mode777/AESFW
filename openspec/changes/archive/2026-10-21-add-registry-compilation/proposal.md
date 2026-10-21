# Proposal

## Why

Roadmap 08, M1 item 1.4 (`add-registry-compilation`, capability `content/registry`, size M). Composition (1.3) yields resolved raw definitions, but the simulation needs dense handles, resolved references, indexes, a canonical checksum, and a frozen registry. This row implements the compilation stages of TDS-20.2 and the `Registry` abstraction core has referenced since 0.5, retiring R-05. Depends on: `add-definition-composition` (1.3) and `add-world-state-model` (0.5) — both archived 2026-10-21.

## What Changes

- Add `buildRegistry(definitions, options)` to `@aesfw/content`: assign dense handles per definition type in ascending string-ID order (TDS-7), resolve the M1 reference kinds (CONT-11.3), build an ID index and a resource tag index, and return a deeply frozen registry that implements the core `Registry` interface.
- Add `resolveReferences` reporting `unresolved_reference`, `reference_type_mismatch`, and `invalid_reference_scope` (a capability requirement must reference a capability-tagged resource), and `buildIndexes` building the ID and tag indexes.
- Add `normalize(definitions)` and `checksum(registry)` (TDS-20.2 steps 10–11): a canonical representation and `fnv1a64` of its canonical JSON.
- Add `loadContent(sources, options)` (TDS-20.1) orchestrating the stages implemented so far and returning `ContentResult`; content is `null` when any error-severity diagnostic is present.
- Add unit tests for handle assignment, each reference kind, each diagnostic, indexes, checksum, and a property test for P-12 (handle and checksum independence of file order).
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- `content/registry`: reference resolution, handle assignment, indexes, normalization, checksum, the frozen compiled registry, and the `loadContent` orchestration.

### Modified Capabilities

- None. `content/package-loading`, `content/schemas`, and `content/composition` are unchanged.

## Impact

- **Packages:** `@aesfw/content` gains `src/registry/**` (reference resolution, handle assignment, indexes, normalization, checksum, `loadContent`); `src/index.ts` re-exports it. No new runtime dependency is added.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none.
- **Diagnostic codes:** `unresolved_reference`, `reference_type_mismatch`, `invalid_reference_scope`.
- **Out of scope:** condition and curve compilation and their references (`add-condition-and-curve-compiler`, 1.6); graph and economic validation (`add-graph-validation`, 10.1, `add-economic-diagnostics`, 10.2); presentation package validation (10.5); migrations (`add-save-migrations`, 12.1); the testkit content builder (`add-testkit-content-builders`, 1.5).
- **Verification impact:** `pnpm test` gains registry unit and property tests; the new diagnostic codes get fixtures in this change.
