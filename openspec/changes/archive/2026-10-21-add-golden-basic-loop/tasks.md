# Tasks

## 1. Fixture content (design D1)

- [x] 1.1 Create `fixtures/content/demo-basic-loop/package.yaml` and `content.yaml` from CONT-14; verify it loads with no error diagnostics.

## 2. Content entity instantiation (design D2)

- [x] 2.1 Create `packages/testkit/src/scenario/instantiate.ts` with `instantiateContentEntities` and call it from `runScenario`.

## 3. Scenario and goldens (design D3)

- [x] 3.1 Create `fixtures/scenarios/basic_loop.yaml`.
- [x] 3.2 Create `tools/golden/index.mjs` and the root `golden:update` script; generate `fixtures/scenarios/basic_loop.hashes.json`.
- [x] 3.3 Add `packages/host-node/src/basic-loop.test.ts` comparing the scenario checkpoints with the golden file. [VER-9.3, SCN-01]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [VER-9.3, GDD-23.1]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.15 with "✓ archived <date>" in `docs/08`.
