# Proposal

## Why

Roadmap 08, M0 item 0.8 (`add-traceability-tool`, capability `testkit/traceability`, size S). VER-2.2 requires every normative statement to be covered by a test that names its requirement ID or to be listed as exempt with a reason, and VER-3 defines the tool that proves it. Without it, the "every requirement is traceable" principle is aspirational. This row retires R-16 (agent-driven implementation drifts from the specification) at the traceability layer. Depends on: `setup-workspace` (0.1) — archived 2026-10-21.

## What Changes

- Add the trace tool to `tools/trace/`: a Node ESM script that extracts candidate requirement IDs from the numbered headings of docs 01–05 and 07, removes the IDs listed in `tools/trace/exempt.yaml` (each with a reason), scans test titles in every package for `[ID]` tags, writes the generated matrix `docs/traceability.md`, and reports untraced IDs.
- Add `tools/trace/exempt.yaml` seeded with the non-normative sections (purpose and scope statements, acceptance-criteria sections, the amendment and decision-log sections) each with a reason, and `tools/trace/suffixes.yaml` for the suffixed IDs of VER-3.1.
- Add the root script `pnpm trace` and activate the trace stage in `.github/workflows/ci.yml` at the placeholder left by 0.1. Untraced IDs are a warning (exit 0) until milestone M10; a `--strict` flag makes them an error for M10 and later.
- Add a testkit test that spawns the tool on a scratch corpus and checks that traced requirements, exemptions, and untraced reporting behave as specified.
- No **BREAKING** changes; no **HASH-CHANGING** artifacts.

## Capabilities

### New Capabilities

- `testkit/traceability`: the requirement-to-test trace tool, its exemption and suffix data, and the generated traceability report that makes the VER-2.2 traceability principle checkable.

### Modified Capabilities

- None. `testkit/harness` is unchanged.

## Impact

- **Packages:** no package source changes; `@aesfw/testkit` gains one test that drives `tools/trace`. `tools/trace/**` is repository tooling (exempt from the purity rules, like the other `tools/` scripts).
- **Tooling/CI:** new `tools/trace/index.mjs`, `tools/trace/exempt.yaml`, `tools/trace/suffixes.yaml`, generated `docs/traceability.md`, root `trace` script, and the CI trace stage (VER-15.3).
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none. **Diagnostic codes:** none.
- **Out of scope:** enforcing traceability as a merge gate (M10 turns the warning into an error); per-milestone section scoping (the tool reports all untraced IDs, the milestone scoping is a documentation concern); coverage thresholds (VER-15.1, later rows).
- **Verification impact:** `pnpm trace` becomes runnable and `docs/traceability.md` is generated; the final task of every later change can run it.
