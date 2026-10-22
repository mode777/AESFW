# Tasks

## 1. Runner (design D1–D3)

- [x] 1.1 Create `packages/testkit/src/bench/types.ts` and `runner.ts` with `runBenchmark`; add `index.ts` and the `./bench` export.
- [x] 1.2 Extend `.dependency-cruiser.cjs` and `vitest.config.ts` for the `@aesfw/testkit/bench` subpath.

## 2. Scenario and CLI (design D4)

- [x] 2.1 Create `fixtures/scenarios/bench_small.yaml`.
- [x] 2.2 Add the `bench` command to `packages/host-node/src/cli.ts` and the root `pnpm bench` script.

## 3. Nightly (design D5)

- [x] 3.1 Add the `pnpm bench` step to `.github/workflows/nightly.yml`.

## 4. Tests

- [x] 4.1 Add `packages/testkit/src/bench/bench.test.ts` with a fake clock covering median, p95, warm-up, and entity count. [TDS-24, VER-14]
- [x] 4.2 Add a `bench` command test in `packages/host-node/src/cli.test.ts`. [TDS-21.2]

## 5. Documentation and verification

- [x] 5.1 Review `docs/08_Implementation_Roadmap.md` for scope, dependency, or risk changes; expected: none (mark the row done only at archive).
- [x] 5.2 Confirm no amendment to 01–07 is required.
- [x] 5.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [TDS-24, VER-14]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 1.16 with "✓ archived <date>" in `docs/08`.
