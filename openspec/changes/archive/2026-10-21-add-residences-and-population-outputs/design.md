# Design — add-residences-and-population-outputs

## Context

`add-capability-allocation` (1.9) is archived: phase 05 aggregates `capabilityProvider` rates into pools. `fx.accumulate` implements the TDS-6.4 recurrence and `world.accumulators` exists as an empty table. GDD-11 fixes the population shape and outputs. This document records the component shapes, the accumulator keying, and the phase-26 wiring.

## Goals / Non-Goals

**Goals:** the residence and population-group components, the accumulator helpers, and the phase-26 capability output that feeds the next tick's pools.

**Non-Goals:** need demand and consumption (1.12), growth (1.13), satisfaction scaling (1.12), income and maintenance (4.1, 4.2), decay and transitions (7.3).

## Decisions

### D1 — Module layout

`packages/core/src/sim/population/` holds `types.ts`, `accumulators.ts` (world-table carry read/write), `outputs.ts` (`applyPopulationOutputs`), and `index.ts`. `phase-26-apply-continuous-outputs-and-maintenance.ts` calls `applyPopulationOutputs`.

### D2 — Components

```ts
type PopulationOutput = {
  resource: DefinitionHandle;
  ratePerPopulationPerTick: Int;
  scope: CapabilityScope;
  satisfactionCurve: DefinitionHandle | null;
};
type Residence = {
  tier: DefinitionHandle;
  capacity: Int;
  location: EntityId | null;
  growthPolicy: DefinitionHandle | null;
  consumptionFactor: Int;
  outputs: readonly PopulationOutput[];
};
type PopulationGroup = { tier: DefinitionHandle; count: Int; capacity: Int };
```

Resolved outputs are stored on the residence so the core stays content-free (TDS-4.3), as with recipes (1.10).

### D3 — Accumulators

`readCarry(world, subject, purpose, resource)` returns the stored carry or `0`; `writeCarry` inserts or replaces the entry, keeping `world.accumulators.entries` sorted by `(subject, purpose, resource)` and dropping zero carries. `applyPopulationOutputs` uses `fx.accumulate(baseRate, 1000, carry)`; because the multiplier is `1000` until satisfaction scaling lands in 1.12, the carry stays `0` for whole rates but is preserved for fractional ones.

The accumulator `purpose` is `population_need`, the only purpose in the TDS-12.1 union that names a population rate; outputs are capabilities, which needs never reference, so no collision occurs in practice. This is recorded as a v1 interpretation.

### D4 — Phase 26

`applyPopulationOutputs` iterates residences in ascending entity ID, skips a residence without a population group, and for each output publishes one `capabilityProvider` on the residence with the accumulated amount and the output's scope. Because one entity has one provider component, a residence publishes its first output; multi-output residences are a later-row concern. The published provider is aggregated by phase 05 of the **next** tick, matching the fixed phase order (ARCH-5.2) in which phase 26 runs after phase 06.

### D5 — Determinism

All iteration is ascending entity ID; arithmetic uses `fx`; no RNG. The accumulator table order is deterministic.

## Amendments and clarifications to 01–07

- None. The `population_need` purpose choice and the one-output-per-residence limit are v1 interpretations, not document changes.

## Risks / Trade-offs

- [Capability output is available one tick later] → follows the fixed phase order; M1 scenarios warm up for one tick.
- [One output per residence] → the M1 tier has one output; a later row generalises provider components.
- [Satisfaction scaling deferred] → 1.12 supplies the multiplier.

## Migration Plan

Additive modules plus one implemented phase. No goldens or saves exist. Rollback is reverting the change.

## Open Questions

None blocking.
