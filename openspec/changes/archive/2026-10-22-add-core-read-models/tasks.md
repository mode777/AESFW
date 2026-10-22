# Tasks

## 1. Read models (design D1–D5)

- [x] 1.1 Create `packages/app/src/readmodels/metadata.ts`, `entity-detail.ts`, `location-summary.ts`, and `need-breakdown.ts`.
- [x] 1.2 Create `readmodels/index.ts` and export the read models from `packages/app/src/index.ts`.

## 2. Tests

- [x] 2.1 `packages/app/src/readmodels/readmodels.test.ts` — metadata tags, entity detail (residence and unknown), location summary totals, need breakdown fulfillment and non-residence. [PIC-4, PIC-10.1–10.3]

## 3. Documentation and verification

- [x] 3.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 3.2 Confirm no amendment to 01–07 is required.
- [x] 3.3 Run `pnpm verify` and `pnpm trace`; all green, no new untraced requirement IDs, goldens unchanged. [PIC-4, PIC-10]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.4 with "✓ archived <date>" in `docs/08`.
