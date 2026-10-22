# Tasks

## 1. Persistence (design D1–D4)

- [x] 1.1 Create `packages/app/src/persistence/types.ts` with `SaveDocument` and `SaveHeader`.
- [x] 1.2 Create `packages/app/src/persistence/save.ts` with `save`.
- [x] 1.3 Create `packages/app/src/persistence/load.ts` with `load` and the `content_mismatch` diagnostic.
- [x] 1.4 Create `packages/app/src/persistence/index.ts` and export from `packages/app/src/index.ts`.

## 2. Tests

- [x] 2.1 `packages/app/src/persistence/persistence.test.ts` — header fields, state round-trip, matching load, checksum mismatch, save-continue determinism. [TDS-19.1, SCN-13]

## 3. Documentation and verification

- [x] 3.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 3.2 Confirm the design's clarification is recorded.
- [x] 3.3 Run `pnpm verify` and `pnpm trace`; all green, no new untraced requirement IDs, goldens unchanged. [TDS-19.1, ARCH-15]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.5 with "✓ archived <date>" in `docs/08`.
