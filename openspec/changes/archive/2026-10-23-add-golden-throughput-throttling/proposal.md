# Proposal

## Why

Roadmap 08, M5 item 5.3 (`add-golden-throughput-throttling`). Throughput allocation (5.1) and storage expansion (5.2) exist, but no golden scenario pins the over-densification behaviour, so SCN-10 is unverified end to end and a regression in phase 09/10 ordering or throttling would pass unnoticed. This change adds the theme-free SCN-10 scenario and golden, retiring the R-08 legibility gap that over-densification is not demonstrably visible and reducing R-04 (phase-interaction regressions).

## What Changes

- New theme-free content package `fixtures/content/demo-throughput`: one throughput-limited location with a base throughput, two extractors, and a refiner whose combined per-tick movement exceeds the pool.
- New scenario `fixtures/scenarios/throughput_throttling.yaml` (SCN-10) with a committed golden hash file and invariants enabled on every tick.
- New host test asserting: no findings, `ThroughputThrottled` events occur, a throttled producer reports the reason or completes with scaled output, the double run is identical, and every checkpoint matches the golden.
- A new `testkit/scenarios` requirement that names SCN-10 and its golden.

## Capabilities

### New Capabilities

### Modified Capabilities

- `testkit/scenarios`: ADDED requirement — the SCN-10 throughput-throttling scenario and golden.

## Impact

- **Packages:** `@aesfw/host-node` (scenario test), `@aesfw/testkit` (no code change; the scenario runner already supports the content), `fixtures/` (new content package, scenario, and golden).
- **Tick phases:** exercises 07, 09–13 (preconditions, request collection, allocation, reservation, advancement, commit).
- **Store kinds:** reads the throughput stores; no new kinds.
- **Commands/events/error codes/diagnostics:** none new; asserts `ThroughputThrottled`.
- **Protocol/save format:** none. **HASH-CHANGING:** only the new scenario has a golden; existing goldens are untouched.
- **Dependencies on archived changes:** 5.1 `add-throughput-allocation` (archived 2026-10-23).

## Out of Scope

- 5.4 `add-client-throughput-indicators`: the client gauge, overlay, and R1 storage module.
- 6.x transport throughput requests.
- Reference-content (`ref.*`) scenarios; this fixture is theme-free.
