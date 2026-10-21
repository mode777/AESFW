# Tasks

## 1. Scenario model and runner (design D2, D3)

- [x] 1.1 Create `packages/testkit/src/scenario/types.ts` with the scenario, setup, command, run, expectation, and report types.
- [x] 1.2 Create `packages/testkit/src/scenario/parse.ts` with `parseScenario`.
- [x] 1.3 Create `packages/testkit/src/scenario/runner.ts` with `runScenario`.
- [x] 1.4 Create `packages/testkit/src/scenario/index.ts`, add the `./scenario` export to `packages/testkit/package.json`, and add the testkit `tsconfig` if needed.

## 2. CLI (design D4)

- [x] 2.1 Create `packages/host-node/src/cli.ts` with `CliIo`, `runCli`, and the binary `main`; add the `yaml` dependency and a `bin` entry to `packages/host-node/package.json`.

## 3. Tests

- [x] 3.1 Add `packages/testkit/src/scenario/scenario.test.ts` covering parsing, checkpoints, invariant findings, and determinism. [VER-9.1, VER-9.2]
- [x] 3.2 Add `packages/host-node/src/cli.test.ts` covering validate and run with an injected I/O. [TDS-21.2]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 4.2 Confirm no amendment to 01–07 is required.
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [VER-9.1, VER-9.2, TDS-21.2]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.14 with "✓ archived <date>" in `docs/08`.
