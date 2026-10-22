# Tasks

## 1. Definition component (design D1, D2)

- [x] 1.1 Set the `definition` component in `packages/app/src/content/instantiate.ts` for each content entity.
- [x] 1.2 Add a projection/read-model test asserting the real `definition_id`. [PIC-9.1, PIC-10.1]

## 2. Golden update (design D3)

- [x] 2.1 Run `pnpm golden:update basic_loop` and confirm only `fixtures/scenarios/basic_loop.hashes.json` changed.
- [x] 2.2 Record the hash change in the design (done) and confirm no versioned algorithm tag changed. [VER-9.4]

## 3. Disable integration test (design D4)

- [x] 3.1 Add the disable-lowers-satisfaction integration test. [GDD-10.3, GDD-12.4]

## 4. Documentation and verification

- [x] 4.1 Add a roadmap row 2.11 recording this gap closure; update risks if needed.
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green. [TDS-8.3]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 2.11 with "✓ archived <date>" in `docs/08`.
