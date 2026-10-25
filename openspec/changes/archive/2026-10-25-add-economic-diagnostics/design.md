# Design

## Context

10.1 landed the graph stage (`packages/content/src/validation/`), the diagnostic catalogue, and the invalid-fixture convention. CONT-11.6's checks are balance opinions: they must not reject content that merely plays badly, so they are warnings by default with an explicit promotion knob.

## Goals / Non-Goals

- Goals: the seven CONT-11.6 checks as static, deterministic analyses; zero findings on every shipped fixture package; catalogue and fixture coverage.
- Non-Goals: runtime per-tick economy analysis; CLI promotion flags (10.6); design-intent diagnostics (10.3).

## Decisions

### D1 — Severity model

`LoadOptions.economic_diagnostics: 'warning' | 'error'`, default `'warning'`. `validateGraphs` keeps its signature; the economic check runs inside it and receives the option through a second parameter (default `DEFAULT_LOAD_OPTIONS`), so all existing callers are unchanged. Promotion only changes severity — codes and positions are identical, keeping results deterministic.

### D2 — Static rate model

All checks use per-tick integer rates over composed definitions:
- **Source rate**: `resource_source.outputs[].quantity_per_tick` (any policy; the static maximum).
- **Recipe rate**: `output quantity / duration_ticks` floored, per producer, assuming one producer instance per recipe (static; real counts are runtime).
- **Population rate**: `outputs[].rate_per_population_per_tick` — excluded from supply maxima because it scales with population; a resource supplied only by population outputs can never be statically inadequate.
- **Demand rate**: need `quantity_per_population_per_tick` (one inhabitant) or, for transport equilibrium, the sum of consumer rates at the importing location (recipe inputs × one instance + need demands × one inhabitant per resident tier).

### D3 — Check semantics

- `capability_deficit`: recipe `capability_requirements[].resource` with no source output or population output producing it (capability pools are never recipe-produced — 10.1's storage rule).
- `negative_maintenance_balance`: maintenance (entity or transport unit) charges an owner/global-scoped resource and no population output (scope owner/global), source output, or exchange buy side grants it. `allow_negative: true` balances are still reported — the deficit spiral is the failure mode the check exists for (GDD-20.2); the demo fixtures carry population income, so they stay clean.
- `inadequate_production`: demand rate > total static rate of the demand resource (D2). Only for `resource_consumption` needs.
- `throughput_below_equilibrium`: per world, per imported consumer location (the 10.1 spatial analysis's consumers): demand rate > Σ over carrying units of `slots × slot_capacity / (2 × min_path_ticks + load + unload ticks)`, floored. Only when a path exists (reachable resources; unreachable ones are 10.1 errors).
- `storage_below_batch`: producer `input_inventory`/`output_inventory` refs (`location.<id>`) resolved across initial-activated location templates: inventory total capacity < one batch's total inputs (or outputs).
- `transition_self_lock`: transition cost resource whose only providers are outputs of the transition's `target_tier` or recipes whose capability requirements are only produced by the target tier.
- `exchange_arbitrage_risk`: every recipe input is an exchange good with `buy_from_exchange`, the output is a good with `sell_to_exchange`, and `Σ buy_base × input_qty ≤ Σ sell_base × output_qty` at base prices. Complements 9.1's per-good spread rule (which covers direct round-trips; this covers recipe-mediated loops).

### D4 — Determinism

Iterate in canonical collection order and ascending ID (compose output is sorted); emit findings grouped by check in the fixed order above, each group in scan order. No maps iterated in key order (insertion-ordered maps keyed by scan).

### D5 — False-positive guard

A test loads every `fixtures/content/demo-*` package and asserts zero `stage: 'economic'` findings; the reference content test already asserts strict load, and warnings do not fail loads, so ref.tier stays valid. The shipped fixture amendments of 10.1 (need demands excluded, balances exempt) keep `demo-progression`'s intentional dead-end need and `demo-loss-spiral`'s deficit spiral out of scope: dead-end needs are `inadequate_production`? No — `demo.resource.absent` has zero providers, so production max is 0 < demand → would fire. That fixture *wants* an unsatisfiable need. Guard: `inadequate_production` only fires when the resource has at least one provider (zero-provider needs are graph-level silences by design — the deficit is intentional content). Recorded here and in the check.

## Golden-hash statement

No golden changes: warnings never fail loads, and shipped fixtures are asserted finding-free. (06 §9.4)
