# Tasks

## 1. Core reader (design D1)

- [x] 1.1 Create `packages/core/src/world/reader.ts` with `readWorld` and `WorldReader`.
- [x] 1.2 Export them from `packages/core/src/world/index.ts` and `packages/core/src/index.ts`.

## 2. Protocol delta application (design D4)

- [x] 2.1 Create `packages/protocol/src/delta.ts` with `applyDelta` and `canApplyDelta`.
- [x] 2.2 Export them from `packages/protocol/src/index.ts`.

## 3. App projections (design D2, D3)

- [x] 3.1 Create `packages/app/src/projections/project.ts` with `project`.
- [x] 3.2 Create `packages/app/src/projections/diff.ts` with `diffProjection`.
- [x] 3.3 Create `packages/app/src/projections/index.ts` and export from `packages/app/src/index.ts`.

## 4. Tests

- [x] 4.1 `packages/core/src/world/reader.test.ts` — reader accessors and entity enumeration. [TDS-10.2]
- [x] 4.2 `packages/protocol/src/delta.test.ts` — applyDelta round-trip, canApplyDelta rules. [PIC-18]
- [x] 4.3 `packages/app/src/projections/projections.test.ts` — full snapshot shape and ordering, empty delta, changed field delta, P-10 round-trip. [PIC-9.1, PIC-9.2, PIC-18]

## 5. Documentation and verification

- [x] 5.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 5.2 Confirm no amendment to 01–07 is required.
- [x] 5.3 Run `pnpm verify` and `pnpm trace`; all green, no new untraced requirement IDs, goldens unchanged. [TDS-18.4, PIC-9]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.3 with "✓ archived <date>" in `docs/08`.
