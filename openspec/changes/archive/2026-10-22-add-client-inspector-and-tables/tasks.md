# Tasks

## 1. Worker query handler (design D2)

- [x] 1.1 Extend the worker `query` handler in `packages/host-web/src/worker/session-host.ts` to answer the read-model queries.
- [x] 1.2 Add a host test for an entity-detail query. [TDS-21.1]

## 2. Selectors (design D1)

- [x] 2.1 Create `reference/client-web/src/selectors/index.ts` with the four selectors.
- [x] 2.2 Add `src/selectors/selectors.test.ts`. [REF-12.3, REF-12.4]

## 3. Views (design D3, D4)

- [x] 3.1 Create `src/views/inspector.ts`, `inventory-table.ts`, and `population-table.ts`.
- [x] 3.2 Wire selection, queries, table mode, and the inspector commands in `src/main.ts`.

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green. [REF-12, REF-15]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.9 with "✓ archived <date>" in `docs/08`.
