# Design

## Context

10.1/10.2 established the validation module, catalogue, severity knobs (`economic_diagnostics`), and the fixture conventions. CONT-11.7's checks are *opinions about design ideas*, deliberately weaker than correctness checks: they must be able to run on any package without breaking loads.

## Goals / Non-Goals

- Goals: the ten CONT-11.7 checks, an opt-in knob with promotion, the valid/invalid fixture pair per 06 §10.2.
- Non-Goals: the M11 CI gate, changes to any existing load path, runtime analysis.

## Decisions

### D1 — Opt-in by default

`LoadOptions.design_intent: 'off' | 'warning' | 'error'`, default `'off'`. CONT-11.7's "warnings by default" is interpreted as *severity when run*, not *always run*: 78 existing tests assert exactly-empty diagnostic lists, and design-intent findings on partial test content (no coverage needs, no distribution rules) would be noise, not signal. The consumers that want the opinion opt in: the M11 reference-content gate loads with `'error'` (06 §10.3), and a report CLI passes `'warning'` (10.6). Severity model mirrors `economic_diagnostics`.

### D2 — Scarcity audit (GDD-3.2)

One diagnostic, `inactive_scarcities`, with an alphabetically sorted `scarcities` arg. Activity detection (static, per the requirement text): finite space — any location template with positive `total_capacity` or a grid `width`/`height`; finite slots — any source with policy `slot_dependent`/`area_dependent` or `depletion` other than `none`; disjoint distribution — the `distribution_rules` collection is non-empty; exact binding — some recipe declares capability requirements and no capability-tagged resource declares `substitutes`; throughput limit — any template with `internal_logistics`; maintenance while idle — some maintenance with `charge_policy != 'while_processing'`; asymmetric decline — some transition listed in a `decline_transitions` with no refund or refund policy `none`.

### D3 — Region and tier analyses

Producers per region are taken from world `initial_entities` bound through location templates (`region` from the world override else the template). Demanded resources are the union of `resource_consumption` need demands. The highest tier is the tier with no outgoing advancement transition (ties: largest output count, then lexicographic — deterministic). `self_sufficient_region` also covers single-location worlds (`region` arg is the location instance). A world with no regions or no initial entities is not judged.

### D4 — The remaining five checks

- `pyramid_bypass`: any capability-tagged resource with a non-empty `substitutes`, or no recipe with capability requirements.
- `breadth_depth_collapse`: `weighted_score` categories with one member or `max(weight) == min(weight)`.
- `coverage_absent`: no `spatial_coverage` demand.
- `idle_cost_absent`: maintenance exists and all policies are `while_processing`, or no maintenance exists at all (the scarcity is inactive either way).
- `decline_symmetric`: a decline transition whose refund covers its advancement costs (policy `fraction: 1000` or `resources` equal to the reverse advancement's costs) or whose conversion retains population (`retain_count`).
- `unbounded_trade`: an enabled good (either side) with `step_change_permille: 0`.
- `ratio_illegible`: for each recipe, demand rate on its outputs (from consuming recipes' input rates and needs) versus its output rate; the required producer count exceeds `LoadOptions.ratio_legibility_threshold` (default `10`).

### D5 — Fixtures

One invalid fixture per code (severity `warning` under `design_intent: 'warning'`; the fixture loader call in the catalogue test passes the option). One valid package `fixtures/content/valid/design-intent/` that activates every idea — two regions with disjoint properties (distribution rule), slot sources, idle-cost maintenance, unrefunded declines, exact capabilities, weighted categories, a coverage need, stepped prices, and legible ratios — asserted finding-free under `design_intent: 'warning'`. The catalogue cross-check extends to design-intent codes for the invalid half; the valid fixture gets its own assertion in the same test file.

## Golden-hash statement

No golden changes: the stage is off by default and no shipped fixture enables it. (06 §9.4)
