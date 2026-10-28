# Tasks

## 1. Runner expectation evaluation (testkit, theme-free)

- [x] 1.1 Implement `expect` evaluation (metrics resolution for population/satisfaction, event counts, comparators) in `@aesfw/testkit/scenario` with results appended to the run report; verify [VER-9.1] unit tests incl. one passing and one failing fixture scenario.
- [x] 1.2 Add `fixtures/scenarios/expectations.yaml` (passing) and a failing twin used by unit tests; verify the fixture loads and the report distinguishes the two.

## 2. Metrics rows and CLI export

- [x] 2.1 Implement metrics-row assembly in the runner (`run.metrics_interval`, default 60) over population, balance, net rate, satisfaction, and traded volume, ascending-ID column order; verify [REF-8] determinism double-run test.
- [x] 2.2 Add `--metrics-out <file>` to `aesfw run` with a stable CSV header and non-zero exit on failed expectations; verify the [TDS-21.2] CLI scenarios incl. exit codes.

## 3. Balance corpus (reference/content/test/balance)

- [ ] 3.1 Author the opening strategy (first S1 chain, second-tier economy) as a player-command scenario; verify it runs to its horizon with no findings [REF-8]. The packer, the harness, and a full opening build plan exist (`strategies.ts`); with defects 1–6 fixed the plan runs with no findings and no rejected commands, but does not yet reach the first advancement, so the strategy and the content still need the work described in the design's balance findings.
- [ ] 3.2 Author the overexpansion strategy (deficit entry, then expansion stop) and the pyramid variant (> 60 % advancement); verify their metrics rows via [REF-8] tests. Blocked by 3.1.
- [ ] 3.3 Implement the balancing-target checks as reference tests (advancement window 900–1500, pyramid starvation, trade share < 20 % over the last 600 ticks, recovery ≤ 1800 ticks, start-state no-deadlock); verify each [REF-8] scenario. Blocked by 3.1.
- [ ] 3.4 Retune `ref.tier` start stock or rates where a target fails, or record the deviation in this change's design; verify the full corpus re-runs green. Blocked by 3.1; the measured direction (income ×10, higher C1 stock) is recorded in the design as provisional and not committed.

## 4. Documentation and verification

- [ ] 4.1 Document the "equilibrium = final 600 ticks" definition and any deviations in this design; update 08 only if risks or dependencies moved. Partly done: the design records the corpus findings; the equilibrium definition is unchanged.
- [ ] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Green as of this commit; re-run after 3.1–3.4.
