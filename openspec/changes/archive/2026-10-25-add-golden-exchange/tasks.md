# Tasks

## 1. Fixture

- [x] 1.1 [SCN-06] Extend `demo-exchanges` with owner starting credits (`initial_resources`) and the transport unit at the exchange location. Verify: `aesfw validate --strict`.
- [x] 1.2 [SCN-06, GDD-17.3] Write `fixtures/scenarios/exchange_loop.yaml` (buy phase, sell phase, recovery idle, final sale) with checkpoints every `20` ticks and invariants enabled. Verify: the CLI runs the scenario with zero findings.

## 2. Golden and consumer test

- [x] 2.1 [VER-9.3] Commit `fixtures/scenarios/exchange_loop.hashes.json` from the verified run. Verify: golden matches on every run.
- [x] 2.2 [SCN-06, VER-9.3] Add `packages/host-node/src/exchange-loop.test.ts`: zero findings, the `Traded` price sequence `1000, 1100, 1200, 800, 720, 640, 800`, golden checkpoint match, byte-identical repeat run. Verify: host-node tests green.

## 3. Documentation and verification

- [x] 3.1 Record the D1–D3 decisions; confirm the golden is new-file only (06 §9.4). Verify: no existing golden changes.
- [x] 3.2 Run `pnpm verify` and `pnpm trace`; all green, SCN-06 traced. Verify: command output.
