# Design — add-traceability-tool

## Context

0.1 (workspace) is archived and its CI skeleton carries a commented trace-stage placeholder. The `tools/` directory already holds repository tooling (`lint-theme-free.mjs`, `vitest.purity-setup.ts`) and is exempt from the pure-package lint rules. What the tool must do is fixed by VER-3; this document records only the choices VER leaves open.

## Goals / Non-Goals

**Goals:** extract candidate requirement IDs from 01–05 and 07; honour an exemption list with reasons; scan test titles for tags; generate `docs/traceability.md` deterministically; report untraced IDs as a warning with a `--strict` gate; run in CI.

**Non-Goals:** turning the warning into a hard merge gate before M10; scoping untraced reporting to per-milestone sections; coverage thresholds (VER-15.1); mutation testing (VER-15.2).

## Decisions

### D1 — Layout and data files

`tools/trace/index.mjs` is a Node ESM script with a `main()` and small pure helpers (`extractIds`, `loadExempt`, `scanTags`, `renderReport`). `tools/trace/exempt.yaml` maps requirement IDs to a reason string. `tools/trace/suffixes.yaml` lists valid suffixed IDs (VER-3.1). Both are read with the `yaml` package already present in the workspace (root dependency via `@aesfw/content`; the tool imports it from the workspace root). `docs/traceability.md` is generated and committed so reviewers can diff it.

### D2 — Extraction

Each document maps to a prefix: `01→GDD`, `02→ARCH`, `03→CONT`, `04→PIC`, `05→TDS`, `07→REF`. The tool scans lines matching `^#{2,4} (\d+(?:\.\d+)*)\.?\s` and produces `<prefix>-<number>`, trimming a trailing dot. Duplicate headings with the same number collapse to one ID. Doc 06 (`VER-*`) and the `INV-*`/`SCN-*` catalogues are not extracted (VER-3.3 says 01–05 and 07); test tags for `VER-*`, `INV-*`, and `SCN-*` still appear in the report when a test uses them, because the scan is prefix-agnostic.

### D3 — Exemptions

`exempt.yaml` is an array of `{ id, reason }`. A non-empty `reason` is required; an entry with a missing or empty reason is an error (exit non-zero) so exemptions cannot be added silently. Exempt IDs are removed from the candidate set before untraced reporting, but their tests (if any) are still listed in the report.

### D4 — Test tag scan

The tool walks `packages/*/src`, `reference/*/src`, and `fixtures/` for `*.test.ts` and `*.prop.test.ts` files and matches every `[PREFIX-<number>(.<number>)*]` occurrence anywhere in the file (titles are the convention, but matching the whole file is robust to multi-line titles). Each match records the file path against the ID.

### D5 — Report format

`docs/traceability.md` has a header naming the generator and the algorithm, then a table of `Requirement | Tests` for every candidate ID (exempt IDs marked as exempt with their reason), then a section listing untraced IDs. The file is regenerated from scratch on every run so its content is a pure function of the documents, the exemption list, and the tests.

### D6 — Gate semantics

By default the tool prints a summary and exits `0` even when untraced IDs remain (VER-3.3, warning until M10). With `--strict` it exits `1` when the untraced list is non-empty. An exemption error always exits `1`.

### D7 — CI stage

`.github/workflows/ci.yml` gains a `pnpm trace` step after the unit tests (VER-15.3 order), replacing the commented placeholder; the nightly workflow notes it. `pnpm trace` is added to the root scripts.

### D8 — Testability

The tool's helpers are exported from `index.mjs` (guarded by `import.meta.main`-style detection: `main()` runs only when the file is executed directly). A testkit test spawns the script against a scratch fixture tree with a temporary exemption list and asserts extraction, exemption, report, and exit-code behaviour. The CI-stage test in `ci-pipeline.test.ts` is extended to assert the trace step.

## Amendments and clarifications to 01–07

None. The tool implements VER-3 without refining any document.

## Risks / Trade-offs

- [Regex extraction could pick up non-requirement numbered headings] → the report is reviewable and the exempt list is the escape hatch; the algorithm matches only heading lines, not body text.
- [The report churns on every run] → it is generated deterministically and committed; churn reflects real changes in docs or tests.
- [Matching `[ID]` anywhere in a test file could catch a comment] → the convention is titles; matching the file is deliberately permissive and the report shows the file, so a false positive is visible and cheap to fix.

## Migration Plan

Additive tooling and one generated document; no state, save, protocol, or golden artifacts exist. Rollback is reverting the change.

## Open Questions

None blocking.
