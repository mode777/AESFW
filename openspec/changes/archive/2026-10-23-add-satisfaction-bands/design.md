# Design

## Context

Phase 21 writes `satisfaction { z, categories }` for residences with need states; phase 23 grows population from the resolved `growth` component; phase 26 credits normal-storage outputs as owner income scaled by the output's satisfaction curve. `bandState` is already a v1 store kind but has never been written. `registry.definitionDataOf` is the sanctioned raw-data accessor for content data in core (design D3 of 3.2).

## Goals / Non-Goals

- Goals: content band tables; deterministic band selection; effects consumed by phases 23/26; the decline grace timer; INV-09.
- Non-Goals: starting transitions from `enable_advancement`/`trigger_decline` (7.3); exposing bands in projections (7.7, 7.9); multi-tier band sharing beyond a table referenced by several tiers.

## Decisions

### D1 — Content shapes and validation

`satisfaction_bands` maps to the existing `band` definition type, placed after `services` in the collection catalogue. Effects are a TypeBox union with `additionalProperties: false`. Semantic checks live in reference resolution: first `min` must be `0`, minima strictly ascending (covers `[0,1000]` without overlap), `growth.policy` resolves to `growthPolicy`, `output_multiplier.resource` resolves to `resource`. A `trigger_decline.transition` reference is deferred to 7.3, which owns transition definitions (the `transitions` collection does not exist yet).

Tiers gain `satisfaction: { aggregation?: 'average' | 'minimum', bands?: id }`; the app resolves both into the residence (`bands` handle, `satisfactionAggregation`).

### D2 — Band evaluation and state

`bandTableOf(registry, handle)` parses the raw band data (D3 accessor) into resolved effects, resolving the growth policy through `resolveGrowthPolicy` and resource handles through the registry. `bandIndexFor` selects the highest `min ≤ Z` (ascending scan; total order). Phase 22 runs `updateBands` after the sustained-timer updater, in ascending entity ID, and writes:

```ts
{ band, bandIndex, declineTicks, advancementEnabled, growthOverride, outputMultipliers }
```

`outputMultipliers` is sorted by resource handle (total order). A residence without a band table or without a satisfaction component is skipped; no stale state is written because phase 22 rewrites every eligible residence each tick.

### D3 — Effect consumption

- Growth (phase 23): `bandState.growthOverride ?? growth`. The override is the fully resolved `Growth` (interval and steps), so phase 23 needs no extra content read. `resolveGrowthPolicy` moved the v1 fixed-condition parsing into core; the app's instantiation keeps its existing behavior.
- Income (phase 26): `multiplier = floor(curveMultiplier × bandMultiplier / 1000)` with `bandMultiplier` defaulting to `1000`. Applied to normal-storage outputs only, matching GDD-20.2's owner income.
- `enable_advancement` and `trigger_decline` are stored in `bandState` and consumed by 7.3.

### D4 — Decline grace timer

`declineTicks` starts at `1` on the first tick in a `trigger_decline` band (rather than `0`), so `declineTicks >= grace_ticks` can be evaluated after the first tick without an off-by-one. It resets to `0` in any band without `trigger_decline` and when the band index changes. GDD-12.6 describes the grace period as a sustained-condition timer; the counter is the equivalent authoritative state for this row (it is keyed by the residence's band, not by a content condition), and 7.3 consumes it.

### D5 — Invariant

INV-09 is checked in the testkit harness by re-parsing the band table minima from registry data and verifying the recorded band contains Z; a residence with a band table and a satisfaction value must have state. The harness stays registry-driven rather than importing core band helpers, matching the existing invariant style.

## Clarifications recorded (no normative amendment)

- CONT-6.19 does not state the initial grace-counter value; this change records `1` on entry (D4).
- `satisfaction.bands` is the tier-level reference implied by CONT-6.10's `satisfaction` block; the schema now accepts it.

## Risks / Open Questions

- Band re-parsing per residence per tick in phase 22 is a content-data read; bounded by residences with band tables and revisited in the M7 benchmark note.
