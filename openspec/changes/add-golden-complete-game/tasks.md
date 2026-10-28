# Tasks

## 1. SCN-14 scenario and golden

- [x] 1.1 Author `reference/content/test/scenarios/complete_game.yaml` from 11.2's opening strategy (7200 ticks, invariants all, hash_interval 600, expectations: advancement event and final S2 population); verify it runs clean headlessly [VER-9.3 SCN-14].
- [x] 1.2 Add `complete_game.hashes.json` via `pnpm golden:update` with the reason "new scenario" recorded here; verify the golden regenerates identically on a second run [VER-9.4].
- [x] 1.3 Add the host-node driver test running the scenario, the double-run harness, and save-continue at tick 3600; verify [VER-8.1] harness scenarios pass.

## 2. SCN-18 reference half

- [x] 2.1 Add the reference test placing the Appendix B.3 chain from `ref.tier` definitions and asserting supported population 200 S1 / 133 S2 from the planning read model; verify both [VER-9.3 SCN-18] scenarios.
- [x] 2.2 If the assertion fails, trace the conversion (07 §4) before touching anything; record the resolution in this design [GDD-3.8, PIC-10.5].

## 3. Traceability and documentation

- [x] 3.1 Remove the SCN-14 and SCN-18 exemption entries from `tools/trace/exempt.yaml`; verify `pnpm trace --strict` passes with both traced.
- [x] 3.2 Update 08's M11a exit-criteria wording only if a deviation was recorded (e.g. nightly gating); otherwise no document change.
- [x] 3.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
