# Tasks

## 1. Fixture

- [x] 1.1 [GDD-16.3] Extend `demo-exploration` with the package source entity and a second transport unit. Verify: the fixture loads and the gateway tests stay green with dynamic IDs.

## 2. Core

- [x] 2.1 [INV-20] Mark the derived caches dirty on a successful establishment. Verify: the scenario reports no INV-20 finding.

## 3. Scenario and golden

- [x] 3.1 [SCN-05, VER-9.3] Add `fixtures/scenarios/exploration_loop.yaml` with the load/explore/establish timeline and commit `exploration_loop.hashes.json`. Verify: `aesfw run` reports no findings and emits both discovery and establishment.
- [x] 3.2 [VER-9.3] Add the `[VER-9.3][SCN-05]` host-node golden test (checkpoints, findings, events, byte-identical repeat). Verify: the test passes.

## 4. Documentation and verification

- [x] 4.1 Record the golden reason and timeline decisions (design); confirm `docs/08` needs no change beyond archiving. Verify: no unintended document diff.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
