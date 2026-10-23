# Design

## Context

Scenario goldens hash canonical world state at fixed intervals and assert invariants (VER-9.3). The fixture uses abstract-capacity locations, so entities carry no transforms; capability supply is rebuilt from providers in phase 05; transitions run in phase 24 after capability allocation.

## Goals / Non-Goals

- Goals: a deterministic M7 scenario with a golden and intent tests.
- Non-Goals: reference content (M11), client UI (7.9), additional scenarios.

## Decisions

### D1 — Fixture shape

`demo-progression` combines the M7 mechanics in one package: tier 1 outputs a capability that the food producer requires; tier 2 has a coverage need and a decline-triggering band; a small target tier is the decline destination. Advancement is `automatic` so the scenario is self-playing; decline is band-triggered with a 20-tick grace period.

### D2 — Gap closures

- `buildSustainedTimerUpdater` also tracks conditions referenced by transitions, with residence subjects of the transition's source tier (TDS-14.3).
- The app condition evaluator implements the v1 domain queries used by progression conditions (`aggregate_need_fulfillment`, `residence_population`, `satisfaction_band`, `need_category_fulfillment`, `population_count`, `owner_balance`).
- Coverage treats transform-less entities at the same (abstract) location as co-located (provider at the location covers all residences), so `spatial_coverage` works without a grid.
- Capability supply ignores a stale provider whose residence no longer declares that capability output, so a tier conversion actually starves dependents on the next tick.
- Decline triggers require the transition's source tier to equal the residence's tier, preventing a stale band state from re-firing a decline after a conversion; phase 24 recomputes band state after a completion.
- The phase 24 write set gains `bandState`.

### D3 — Golden

One scenario, `progression_loop`, 60 ticks, checkpoints every 5 ticks, invariants after every tick. The golden is generated once from the deterministic run; no existing golden changes because no shipped fixture uses transitions, services, or bands.

### D4 — Intent tests

SCN-03/07/09 are asserted from the scenario report (transition events, shortage events) and a direct session run (coverage delivery while tier 2). SCN-11 and SCN-12 use direct session runs to inspect the population and inventory (refund/clamp) and to submit purpose-lock commands. SCN-08 asserts equal category fulfillment for two member sets in a core needs test.

## Clarifications recorded (no normative amendment)

- Coverage at transform-less abstract locations is co-located by definition; the grid policy remains authoritative where transforms exist.
