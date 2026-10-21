# Proposal

## Why

Roadmap 08, M1 item 1.5 (`add-testkit-content-builders`, capability `testkit/harness`, size S). Every later M1 test needs content compiled through the real pipeline without hand-writing YAML packages. This row adds the fluent `content()` builder and query/assertion helpers on top of the registry compilation (1.4), retiring R-05's testing cost. Depends on: `add-registry-compilation` (1.4) and `add-testkit-foundation` (0.7) — both archived 2026-10-21.

## What Changes

- Add `content()` to `@aesfw/testkit`: a fluent builder that accumulates definitions per collection, serialises them as a package, and compiles them through `loadContent` (the real pipeline) from an in-memory `PackageSource`.
- Add `ContentBuildResult` exposing the compiled content, registry, checksum, and diagnostics.
- Add query helpers (`definitionsOf`, `definitionById`) and assertion helpers (`expectContentOk`, `expectNoDiagnostics`, `diagnosticCodes`).
- Add unit tests for the builder, the query helpers, and the assertion helpers.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts (no goldens exist yet).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `testkit/harness`: adds the content builder, content query helpers, and content assertion helpers.

## Impact

- **Packages:** `@aesfw/testkit` gains `src/harness/content-builder.ts` and exports it; it already depends on `@aesfw/content`. No new dependency is added.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none. **Diagnostic codes:** none new (the builder surfaces the content pipeline's diagnostics).
- **Out of scope:** the scenario runner and CLI (`add-scenario-runner-and-cli`, 1.14); the golden basic loop (`add-golden-basic-loop`, 1.15); the benchmark harness (`add-benchmark-harness`, 1.16); world-instantiation helpers (1.8).
- **Verification impact:** `pnpm test` gains testkit content-builder tests.
