# Tasks

## 1. Delta hash (design D2)

- [x] 1.1 Add the optional `hash` to `WorkerDeltaResponseDto` and decode it in `packages/protocol`.
- [x] 1.2 Include the last good hash on `delta` responses in `packages/host-web`.
- [x] 1.3 Store the hash in the client's debug metadata and show it in the overlay.
- [x] 1.4 Add a protocol codec test for the delta hash. [TDS-21.1]

## 2. Playwright (design D1, D3, D4)

- [x] 2.1 Create `playwright.config.ts` and the `test:e2e` script.
- [x] 2.2 Create `reference/client-web/e2e/smoke.spec.ts` with flows 1, 2, 4, 6. [VER-13.2]
- [x] 2.3 Create `reference/client-web/e2e/determinism.spec.ts` comparing browser and CLI hashes. [VER-8.2]

## 3. Documentation and verification

- [x] 3.1 Review `docs/08_Implementation_Roadmap.md`; expected: none.
- [x] 3.2 Confirm no amendment to 01–07 is required.
- [x] 3.3 Run `pnpm verify` and `pnpm trace`; all green. [VER-13.2, VER-8.2]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.10 with "✓ archived <date>" in `docs/08`.
