# Design — add-population-growth

## Context

`add-needs-and-satisfaction` (1.12) is archived: phase 21 writes residence satisfaction `Z`; `add-residences-and-population-outputs` (1.11) writes population groups; the world-resident accumulator helpers exist. TDS-11.1 assigns growth to phase 23; GDD-11.4 fixes the growth policy. This document records the resolved condition, the accumulator use, and the phase wiring.

## Goals / Non-Goals

**Goals:** the `growth` component, phase 23, fraction accumulation, the population bound INV-07.

**Non-Goals:** satisfaction bands and grace timers (7.2), transitions (7.3), the general compiled condition language for growth.

## Decisions

### D1 — Module layout

`packages/core/src/sim/population/growth.ts` holds the growth types, the condition predicate, and `updatePopulation`. `phase-23-update-population.ts` calls it.

### D2 — Component

```ts
type GrowthCondition = {
  minSatisfaction: Int | null;
  maxSatisfaction: Int | null;
  requireCapacity: boolean;
};
type GrowthStep = { quantity: Int; condition: GrowthCondition | null };
type Growth = {
  policy: DefinitionHandle;
  intervalTicks: Int;
  increase: GrowthStep | null;
  decrease: GrowthStep | null;
};
```

The condition is the resolved v1 form of the growth condition (satisfaction threshold and capacity availability); the general compiled-condition evaluation is 7.2. The growth system stays content-free (TDS-4.3).

### D3 — Condition

`conditionMet(condition, z, group)` is true when `z ≥ minSatisfaction` (or the minimum is null), `z < maxSatisfaction` (or the maximum is null), and `count < capacity` when `requireCapacity`. A null condition is always true.

### D4 — Phase 23

For each residence ascending entity ID, phase 23 reads its `growth`, `populationGroup`, and `satisfaction`. It selects the increase step when its condition holds and the count is below capacity, otherwise the decrease step when its condition holds and the count is above `0`. It advances the accumulator for `(residence, population_transition, tier)`: `numerator = carry + quantity`, `amount = floor(numerator / intervalTicks)`, `carry' = numerator mod intervalTicks`. When `amount > 0` it adjusts the count by `±amount`, clamps it to `[0, capacity]`, writes the group, and emits `PopulationChanged`. The accumulator turns an interval amount into a per-tick fraction, satisfying the fraction-accumulation rule of GDD-11.4.

### D5 — Determinism and INV-07

Iteration is ascending entity ID; arithmetic is integer; no RNG. `checkInvariants` gains INV-07: every `populationGroup` has `0 ≤ count ≤ capacity`. The tier validity part of INV-07 is guaranteed by construction (the group is created with the residence's tier) and is not separately checkable until tiers become entities (7.3).

## Amendments and clarifications to 01–07

- None. The resolved growth condition is a v1 interpretation; 7.2 replaces it with the compiled condition.

## Risks / Trade-offs

- [Growth conditions are a v1 predicate] → M1 content uses satisfaction and capacity thresholds; 7.2 generalises.
- [Accumulator keyed by the tier handle] → growth has no resource; the tier handle is a stable per-residence key.

## Migration Plan

Additive module plus one implemented phase. No goldens or saves exist. Rollback is reverting the change.

## Open Questions

None blocking.
