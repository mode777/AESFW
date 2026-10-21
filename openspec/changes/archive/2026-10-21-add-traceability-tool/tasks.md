# Tasks

## 1. Trace tool (design D1–D6)

- [x] 1.1 Create `tools/trace/index.mjs` with `extractIds`, `loadExempt`, `scanTags`, `renderReport`, and `main` per design D1–D6, exporting the helpers and running `main()` only when executed directly. Verify: `node tools/trace/index.mjs` exits 0 and writes `docs/traceability.md`.
- [x] 1.2 Create `tools/trace/exempt.yaml` seeded with the non-normative sections (purpose/scope statements, acceptance-criteria sections, amendments, decision log, glossary) each with a reason, and `tools/trace/suffixes.yaml` (VER-3.1). Verify: the tool reports no exemption error.
- [x] 1.3 Add the root script `trace` and a `--strict` variant; run the tool to generate `docs/traceability.md`. Verify: `pnpm trace` exits 0 with the untraced warning; `pnpm trace --strict` exits non-zero while untraced IDs remain.

## 2. CI stage (design D7)

- [x] 2.1 Activate the trace-stage placeholder in `.github/workflows/ci.yml` with a `pnpm trace` step after the unit tests, and note it in `nightly.yml`. Verify: the CI-order test in `@aesfw/testkit` still passes and the new stage test passes.

## 3. Tests (design D8)

- [x] 3.1 Add `packages/testkit/src/trace-tool.test.ts` with one test per spec scenario: `[VER-3.3] a numbered heading yields a prefixed ID`, `[VER-3.3] an exempt ID is not reported untraced`, `[VER-3.3] an exemption without a reason is an error`, `[VER-3.2] a tagged test is mapped to its requirement`, `[VER-3.3] the report is regenerated on each run`, `[VER-3.3] untraced IDs are a warning by default`, `[VER-3.3] the strict gate fails on untraced IDs`, `[VER-15.3] CI runs the trace stage` (the last via `ci-pipeline.test.ts`). Verify: green under `pnpm --filter @aesfw/testkit test`.

## 4. Documentation

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive). Verify: row 0.9 dependency column still accurate.

## 5. Final verification

- [x] 5.1 Run `pnpm verify` and `pnpm trace` on a clean checkout; both green (the trace is a warning until M10). [VER-3, VER-15.3]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 0.8 with "✓ archived <date>" in `docs/08` and confirm row 0.9 remains unblocked.
