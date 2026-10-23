# Tasks

## 1. Fixture and scenario

- [x] 1.1 Create `fixtures/content/demo-loss-spiral` (D1 economics) and validate it strictly. Verify: `aesfw validate fixtures/content/demo-loss-spiral --strict` exits 0.
- [x] 1.2 Create `fixtures/scenarios/loss_spiral.yaml` (600 ticks, hash interval 10, invariants on) and generate its golden with `pnpm golden:update`. Verify: `aesfw run` reports no findings and emits both `DeficitPaused` and `DeficitResumed`.

## 2. Test

- [x] 2.1 [SCN-04, VER-9.3] Host-node golden test: no findings, pause and resume events present, checkpoints match the golden, and a second run is identical. Verify: `packages/host-node/src/loss-spiral.test.ts`.

## 3. Verification

- [x] 3.1 Run `pnpm trace` (SCN-04 lands) and `pnpm verify`; all green; no pre-existing golden changes.
