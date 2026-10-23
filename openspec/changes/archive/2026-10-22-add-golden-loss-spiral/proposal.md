# Proposal

## Why

Roadmap 08, M4 item 4.6 (`add-golden-loss-spiral`). M4's exit criterion is SCN-04: a deficit resolves through a recoverable loss spiral instead of a defeat state (GDD-3.7, GDD-20.3, VER-9.3). The deficit policy machinery (4.3) is unit-tested but no scenario demonstrates the full spiral — deficit → pause → starvation → recovery → resume — as a reproducible golden.

## What Changes

- A theme-free fixture `fixtures/content/demo-loss-spiral`: a producer chain whose maintenance exceeds its population's income, an income output with a satisfaction curve, and growth, so the world cycles deficit → pause → starvation → income recovery → automatic resume.
- A scenario `fixtures/scenarios/loss_spiral.yaml` (600 ticks, invariants on) with committed golden hashes (`SCN-04`).
- A host-node scenario test asserting no invariant findings, that both `DeficitPaused` and `DeficitResumed` events occur (the spiral is recoverable), and that the hashes match the golden.

## Capabilities

### New Capabilities

### Modified Capabilities

- `testkit/scenarios`: ADDED requirement — the SCN-04 loss-spiral scenario and its golden.

## Impact

- **Packages:** `@aesfw/host-node` (the scenario test); `fixtures/` (new content, scenario, golden).
- **Tick phases:** none. **Commands/events:** none new (observes `DeficitPaused`/`DeficitResumed`).
- **Protocol/save format:** none. **HASH-CHANGING:** the new golden is created here (06 §9.4: creation, not modification — no existing hash changes).
- **Dependencies on archived changes:** 4.3 `add-owner-deficit-policy` (archived 2026-10-22), 1.15 `add-golden-basic-loop` (archived 2026-10-21).

## Out of Scope

- M11's reference loss spiral on R4 content with scripted overexpansion (07 §C.2).
- Scenario `expect` evaluation (metrics arrive with later rows).
- Scenario command application in the runner (not needed for a self-playing spiral).
