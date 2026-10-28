# Proposal

## Why

Roadmap 08, M11a item 11.3. M11a's exit criteria demand SCN-14 (complete game: 7,200 ticks, no invariant violation, tier 2 reached by a scripted strategy) and the reference half of SCN-18 (supported population of the Appendix B.3 chain = 200 S1 / 133 S2) — both live in `reference/content/test` (06 §9.3). With 11.1's content and 11.2's strategies and expectation evaluation in place, this row adds the two scenarios, their goldens, and the determinism harnesses around them, completing the M11a content track and retiring **R-08**'s evidence leg.

Depends on: `add-balance-runner-strategies` 11.2 (proposed in this batch — must be archived first; it depends on 11.1). Order within M11: after 11.2; before 11.5 (R4); independent of the client rows.

## What Changes

- SCN-14 as `reference/content/test/scenarios/complete_game.yaml`: the opening strategy of 11.2 run to 7,200 ticks with invariants every tick, expectations pinning the first S1→S2 advancement and tier-2 presence, and a committed golden hash file.
- The reference half of SCN-18: a reference test asserting the planning read model over the Appendix B.3 chain of `ref.tier` reports supported population 200 S1 / 133 S2 (06 §9.3; the framework half ran in 4.5 on a theme-free fixture).
- Determinism harnesses over SCN-14: double-run, save-continue (save mid-run, reload, compare hashes), and clone-run; executed by a host-node test like the other golden scenarios.
- `docs/06` and `docs/08` gain no new requirements; SCN-14/SCN-18 move from "planned (M11)" to traced.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/content`: the reference test suite gains the SCN-14 scenario and golden and the SCN-18 reference assertion.

## Impact

- **Packages:** `@aesfw-ref/content` (test data and tests), `@aesfw/host-node` (the test driver, following the `loss-spiral`/`exchange-loop` pattern). No framework package changes; no phases, store kinds, commands, events, error codes, or diagnostic codes.
- **Goldens:** one new golden file (`complete_game.hashes.json`) — new hashes, no regeneration of existing goldens (06 §9.4).
- **Traceability:** SCN-14 and SCN-18 (reference half) become traced; the exemption entries in `tools/trace/exempt.yaml` for these IDs are removed.

## Out of scope

- `add-balance-runner-strategies` (11.2): the strategies and expectation evaluation this scenario reuses.
- `add-reference-content-full` (11.5): R4 content and any re-balancing; SCN-13 on R4 content is 12.7.
- Browser replay of SCN-14: the replay corpus grows in 12.7's full determinism matrix; the Node-side double-run is here.
