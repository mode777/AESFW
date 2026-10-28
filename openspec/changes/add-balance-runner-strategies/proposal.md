# Proposal

## Why

Roadmap 08, M11a item 11.2. 07 §8 defines six balancing targets (start state, first advancement in 15–25 min, pyramid pressure, trade share, loss-spiral recovery, design intent) that are currently unmeasurable: there is no scripted-strategy corpus, no metrics export, and the scenario runner parses `expect` blocks but never evaluates them (known gap recorded in the M4 and M6 milestone logs). This row makes balancing empirical, retiring the measurement half of **R-08** and unblocking SCN-14 (11.3).

Depends on: `add-reference-content-prototype` 11.1 (proposed in this batch, first in the M11 order — must be archived before this change is applied). Order within M11: after 11.1; before 11.3; independent of the client rows.

## What Changes

- Scenario `expect` evaluation lands in `@aesfw/testkit/scenario` (theme-free): metric expectations (`population`, `satisfaction`), event-count expectations, and `greater`/`greater_equal`/`less`/`less_equal`/`equal` comparators, reported as structured results at each `at` tick (VER-9.1 semantics).
- A corpus of scripted strategies lives in `reference/content/test/balance/`: a competent opening strategy (build order reaching the first S1→S2 advancement), an overexpansion strategy (spending into deficit), and a pyramid-pressure variant (advancing > 60 % of S1 residences).
- `aesfw run` gains a metrics CSV export (`--metrics-out <file>`): per-checkpoint rows of population by tier, balance, net rate, satisfaction, and trade volume, sufficient to check every 07 §8 target by data.
- Balancing-target checks run as reference tests: each 07 §8 target is asserted from strategy runs (deadlock-free start, advancement timing window, pyramid starvation, trade share < 20 %, loss-spiral recovery inside 30 min, design-intent clean — the last re-uses 11.1's audit).
- Balance findings are recorded as deviations or content fixes in `ref.tier` (retuning is content data).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/content`: the R3 package gains the balance corpus (strategies, target checks) of REF-8.
- `host/cli`: `aesfw run` gains the metrics CSV export.
- `testkit/scenarios`: the pure runner evaluates `expect` blocks.

## Impact

- **Packages:** `@aesfw/testkit` (scenario runner, pure — no I/O, CSV rows returned as data), `@aesfw/host-node` (CLI writes the file), `@aesfw-ref/content` (balance corpus, possible `ref.tier` retunes). No changes to `core`, `app`, `protocol`, `content`, or `host-web`.
- **Phases, store kinds, commands, events, error codes, diagnostic codes:** none. The runner consumes the existing scenario format (VER-9.1) — no format change; `expect` semantics were already specified and parsed.
- **Fixtures:** theme-free fixture coverage for `expect` evaluation in `fixtures/scenarios/` (one passing, one failing expectation).
- **Goldens:** none. Strategy runs are checked by expectations, not hashes; SCN-14's golden is 11.3.

## Out of scope

- `add-golden-complete-game` (11.3): SCN-14 and the reference half of SCN-18, including the 7,200-tick golden.
- `add-reference-content-prototype` (11.1): the content being balanced.
- `add-benchmark-harness` successor rows: worker-tick budgets (12.6) and client budgets (11.6).
- Live-progress unlock hints or any projection change (redesign R4).
