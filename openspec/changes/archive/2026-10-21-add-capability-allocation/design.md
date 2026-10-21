# Design — add-capability-allocation

## Context

`add-abstract-capacity-locations` (1.8) is archived: locations, their inventories, and the policy abstractions exist. TDS-11.1 assigns capability supply to phase 05 and allocation to phase 06; ARCH-13 fixes the tick order (clear pools, evaluate providers, aggregate by scope, group requests, allocate, publish); GDD-14 fixes the four models; TDS-6.3 fixes `alloc-v1`. This document records the component shapes, the pool keying, and the allocation order.

## Goals / Non-Goals

**Goals:** capability provider/consumer/allocation state, the phase 05 supply rebuild, the phase 06 allocation under four models, exact matching, explicit substitutes, and INV-05.

**Non-Goals:** population capability outputs (1.11), production capability requirements in phases 07 and 11–13 (1.10), throughput allocation (5.1), read models (app/projections), substitute validation (10.1).

## Decisions

### D1 — Module layout

`packages/core/src/sim/capabilities/` holds `types.ts` (components and enums), `supply.ts` (`buildCapabilitySupply`), `models.ts` (the four allocation models over a request list), `allocate.ts` (`allocateCapabilities`), and `index.ts`. The phase modules `phase-05-rebuild-capability-supply.ts` and `phase-06-allocate-capabilities.ts` call into it.

### D2 — Components

```ts
type CapabilityScope = 'location' | 'owner' | 'global';
type AllocationModel = 'binary' | 'proportional' | 'priority' | 'weighted';
type CapabilityProvider = { capability: DefinitionHandle; scope: CapabilityScope; location: EntityId | null; rate: Int };
type CapabilityConsumer = {
  capability: DefinitionHandle;
  substitutes: readonly DefinitionHandle[]; // ascending, excludes capability
  scope: CapabilityScope;
  location: EntityId | null;
  model: AllocationModel;
  priority: number;
  weight: Int;
  request: Int;
};
type CapabilityAllocation = { capability: DefinitionHandle; granted: Int; shortage: Int };
```

`weight` is a permille-style integer; `priority` is ascending (lower number is served first).

### D3 — Pool keying and phase 05

A pool is keyed by `(scope, location, capability)`; for `owner` and `global` scope the location is `null`. `buildCapabilitySupply(world)` iterates `capabilityProvider` in ascending entity ID and sums `rate` per key, returning an ascending-keyed map. Phase 05 stores it in `scratch` under `capabilitySupply` and writes no authoritative store. Its descriptor declares `reads: ['capabilityProvider']`, `writes: []`.

### D4 — Phase 06 allocation

`allocateCapabilities(world, supply)` iterates `capabilityConsumer` in ascending entity ID and, for each pool key in ascending string order, gathers the consumers whose candidate capabilities include the pool capability, whose scope and location match, and whose remaining request is positive. The pool is allocated under the model of the lowest-ID consumer in the group. Each grant reduces that consumer's remaining request. After all pools, every consumer receives a `capabilityAllocation` with `granted = request − remaining` and `shortage = remaining`, and a `CapabilityShortageDetected` event is emitted when `shortage > 0`. Phase 06 reads `capabilityProvider` and `capabilityConsumer`, writes `capabilityAllocation`, and rebuilds supply itself when the scratch entry is absent, so it is testable with `runPhases([6])` as well as `[5, 6]`.

### D5 — Models

Given a pool supply `C` and a request list in ascending entity ID:

- **binary**: grant the full request while supply remains, in ascending entity ID; otherwise `0`.
- **proportional**: `fx.allocate(C, requests)` (`alloc-v1`, TDS-6.3).
- **priority**: sort by `(priority, entity ID)` and grant `min(request, remaining)`.
- **weighted**: when all weights are equal, proportional; otherwise grant `floor(C × (r_i × w_i) / Σ(r_j × w_j))` capped at `r_i`, then distribute the leftover one unit at a time to the largest exact remainders, ties by ascending entity ID, never exceeding `r_i`.

### D6 — Exact matching and substitutes

A consumer's candidate capabilities are `[capability, ...substitutes]`. Pools are processed in ascending key order, and within a consumer the exact capability pool sorts before substitutes because its key is only ordered by capability handle within the same scope/location; the substitute order is the consumer's ascending list. A consumer never draws from a capability absent from its candidate list. This is the v1 substitute rule; combined multi-pool allocation is deterministic because pools and consumers are both processed in ascending order.

### D7 — Determinism and INV-05

All iteration is ascending entity ID or ascending key; the remainder rule is `alloc-v1`'s. No RNG is used. INV-05 is checkable from the components: for every `(scope, location, capability)`, the sum of `granted` across consumers whose candidate list contains the capability is at most the sum of provider rates for that key. `checkInvariants` evaluates it.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [One model per pool taken from the lowest-ID consumer] → documented; a pool whose consumers disagree on model is a content smell, flagged by validation in 10.1.
- [Weighted is a capped variant, not literally `alloc-v1` on weights] → documented in D5; equal weights reduce to proportional.
- [Substitute matching is a deterministic multi-pass] → documented in D6; M1 content has no substitutes.

## Migration Plan

Additive modules plus two implemented phase systems. No state, save, protocol, or golden artifacts change. Rollback is reverting the change.

## Open Questions

None blocking.
