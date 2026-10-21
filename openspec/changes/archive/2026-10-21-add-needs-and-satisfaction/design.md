# Design — add-needs-and-satisfaction

## Context

`add-production-processes` (1.10) and `add-residences-and-population-outputs` (1.11) are archived: producers consume and deposit, residences hold aggregate population, and `world.accumulators` exists. TDS-11.1 assigns demand to phase 08, delivery to phase 20, and satisfaction to phase 21; GDD-12 fixes the need, category, and satisfaction formulas. This document records the component shapes and the phase wiring.

## Goals / Non-Goals

**Goals:** need and category specification, demand, delivery from shared inventories, fulfillment windows, every category mode, residence satisfaction `Z`, and INV-08.

**Non-Goals:** service-capacity, spatial-coverage, and state-query needs (7.6); satisfaction bands and grace timers (7.2); growth (1.13); need effects (7.2); income (4.1).

## Decisions

### D1 — Module layout

`packages/core/src/sim/needs/` holds `types.ts`, `demand.ts` (phase 08), `deliver.ts` (phase 20), `fulfillment.ts` (phase 21), and `index.ts`.

### D2 — Components

The `residence` component gains `needs`, `categories`, and `satisfactionAggregation`. A `NeedSpec` carries `(need, category, type, resource, quantityPerPopulationPerTick, measurementWindowTicks, targetRatio)`; a `CategorySpec` carries `(category, mode, requiredScore, members[{need, weight}])`. The `needStates` component carries, per need ascending, `(need, demanded, window)` where `window` holds the last delivered amounts. The `satisfaction` component carries `(z, categories[{category, fulfillment}])`. Resolved need and category data lives on the residence so the core stays content-free (TDS-4.3).

### D3 — Demand (phase 08)

For each residence ascending entity ID and each `resource_consumption` need, `demand = mulDiv(quantityPerPopulationPerTick × count, consumptionFactor, 1000, 'floor')`. The demand is stored in the need state. `resource_availability` needs use the same demand but are not consumed in phase 20.

### D4 — Delivery (phase 20)

For each residence ascending, resolve accessible inventories through `shared_location`, then for each need: compute the available quantity across those inventories; `delivered = min(demand, available)`; for a consumption need call `ctx.tx.withdraw` for the delivered amount from the first accessible inventory with stock (ascending ID) and emit `NeedFulfilled` or `NeedUnfulfilled`; append `delivered` to the window and trim it to `measurementWindowTicks`. Availability needs record the delivered amount without withdrawing.

### D5 — Fulfillment and categories (phase 21)

For each need, `a = window.length === 0 || demand === 0 ? 1000 : min(1000, floor(1000 × Σwindow / (demand × window.length)))`. Category modes: `all` = min member, `any` = max member, `average` = mean, `minimum` = min member, `weighted_score` = `min(1000, floor(Σ(weight × a) / requiredScore))`, `count` = `min(1000, floor(1000 × satisfied / requiredScore))` where `satisfied` counts members with `a ≥ targetRatio` and `requiredScore` is the required count. Every result is clamped to `[0, 1000]`.

### D6 — Satisfaction (phase 21)

`Z` is the mean of active category fulfillments for `average` (the default) or the minimum for `minimum`, clamped to `[0, 1000]`. A category is active when the residence's tier lists it (all categories on the residence are active in this row).

### D7 — Determinism and INV-08

Iteration is ascending entity ID and ascending need/category handle; arithmetic uses `fx`; no RNG. `checkInvariants` gains INV-08: every need fulfillment, category fulfillment, and satisfaction is in `[0, 1000]`. Fulfillments are computed in phase 21 and stored on `satisfaction` and (optionally) need states; the check reads `satisfaction`.

## Amendments and clarifications to 01–07

- None. The `count`-mode formula is a v1 interpretation of GDD-12.3 (which fixes only the weighted-score formula); it is recorded here.

## Risks / Trade-offs

- [Fulfillment uses a delivered-amount window against current demand] → deterministic approximation; diagnostics keep demand, delivery, and fulfillment separate (GDD-12.4).
- [All categories on a residence are active] → tier-to-category activation is trivial in M1; 7.5/7.6 refine it.
- [Service, coverage, and state-query needs deferred] → 7.6.

## Migration Plan

Additive modules, a residence component extension, and three implemented phases. No goldens or saves exist. Rollback is reverting the change.

## Open Questions

None blocking.
