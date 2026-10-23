# Tasks

## 1. Runner

- [x] 1.1 [VER-9.1] Apply due scenario commands through the application command gateway and record rejections. Verify: scenario runner tests.
- [x] 1.2 [VER-9.2] Confirm existing scenario goldens are unchanged. Verify: full test run.

## 2. Fixture and golden

- [x] 2.1 [SCN-02] Add the theme-free two-location logistics fixture with source, producer, residence, transport, and route template. Verify: content validation.
- [x] 2.2 [SCN-02] Add the scenario with create and assign commands, invariants, and a 10-tick hash interval. Verify: CLI run with no findings.
- [x] 2.3 [SCN-02, VER-9.3] Commit the golden and add the host-node golden/replay test. Verify: test passes.

## 3. Documentation and verification

- [x] 3.1 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record the scenario-command clarification. Verify: no unintended document change.
- [x] 3.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
