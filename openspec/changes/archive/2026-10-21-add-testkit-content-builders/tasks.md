# Tasks

## 1. Content builder (design D1–D4)

- [x] 1.1 Create `packages/testkit/src/harness/content-builder.ts` with `content()`, `ContentBuilder`, and `ContentBuildResult` per design D2/D3/D4.
- [x] 1.2 Add the query helpers (`definitionsOf`, `definitionById`) and assertion helpers (`expectContentOk`, `expectNoDiagnostics`, `diagnosticCodes`) per design D5.

## 2. Tests (design D3, D5)

- [x] 2.1 Add `packages/testkit/src/harness/content-builder.test.ts` with one test per spec scenario: builder compiles, builder surfaces diagnostics, find by id, absent returns null, assertion passes, assertion throws, diagnostic codes.

## 3. Public surface (design D1)

- [x] 3.1 Extend `packages/testkit/src/harness/index.ts` and `packages/testkit/src/index.ts` to re-export the builder. Verify: `pnpm type-check` green.

## 4. Documentation

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 4.2 Confirm no amendment to 01–07 is required.

## 5. Final verification

- [x] 5.1 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [VER-5.2]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.5 with "✓ archived <date>" in `docs/08`.
