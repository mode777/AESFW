# Proposal

## Why

Roadmap 08, M7 item 7.8 (`add-progression-goldens`). M7's mechanics exist but nothing proves them end to end: there is no theme-free content with two tiers, a transition, coverage, and a purpose-locked cost, and no scenario golden for SCN-03, 07, 08, 09, 11, or 12. This change adds the fixture, the golden, and the intent tests that retire the remaining verification gap of R-08.

## What Changes

- New theme-free fixture `fixtures/content/demo-progression`: two tiers (plus a small decline target tier), food/goods/construction resources, a capability output, a producer requiring it, a coverage service and provider, weighted-score categories for breadth and depth, an advancement transition, a decline transition, satisfaction bands (advancement-enabled and decline-triggering), and growth policies.
- New scenario `fixtures/scenarios/progression_loop.yaml` with `progression_loop.hashes.json`: 60 ticks, invariants on, checkpoints every 5 ticks.
- Tests asserting the scenario intents: advancement and decline complete (SCN-03), primary production starves after the only tier-1 population advances (SCN-07), breadth and depth reach equal category fulfillment (SCN-08), a coverage need is satisfied while the higher tier is active (SCN-09), decline refunds nothing and clamps population (SCN-11), and a purpose lock paces advancement until cleared (SCN-12).
- Gap closures found while building the fixture: owner-scoped transition-condition timers (phase 22), residence-subject domain queries in the app condition evaluator, coverage at transform-less abstract locations, capability supply excluding residences that lost their capability output, and the decline-trigger source-tier guard.

## Capabilities

### New Capabilities

- `testkit/scenarios`: the progression scenario, its golden, and the intent coverage.

### Modified Capabilities

- none (the gap closures refine existing requirements' implementations without changing their contracts).

## Impact

- **Packages:** `fixtures/` (new content and scenario), `@aesfw/host-node` (scenario tests), `@aesfw/core` (timer scope, capability supply filter, decline guard, coverage at abstract locations), `@aesfw/app` (domain queries), `@aesfw/testkit` (none).
- **Tick phases:** phase 22 (transition residence timer scopes), phase 05 (supply filter), phase 20 (coverage at abstract locations), phase 24 (decline guard).
- **Store kinds / commands / events / protocol:** none new.
- **Golden:** a new scenario golden only; existing goldens are unchanged (no shipped fixture has transitions, services, or bands). **HASH-CHANGING** for the new scenario only.
- **Dependencies on archived changes:** 7.3, 7.4, 7.5, 7.6 (all archived 2026-10-23).

## Out of Scope

- 7.9 `add-client-population-and-transitions`: the client progression UI.
- M11 `add-reference-content-prototype`: reference progression content and SCN-14.
