# Proposal

## Why

Roadmap 08, M7 item 7.2 (`add-satisfaction-bands`). Satisfaction Z is computed but has no consequences beyond a smooth income curve, so GDD-12.6's band table — the mechanic that turns satisfaction thresholds into growth, income, advancement, and decline effects — is absent, and INV-09 cannot be checked. This change adds band tables, their effects, the decline grace timer, and INV-09, retiring the threshold-legibility part of R-08 and unblocking 7.3's decline transitions.

## What Changes

- New `satisfaction_bands` content collection (CONT-6.19, `band` definition type): `{ id, bands: [{ min, effects }] }` with effects `growth`, `output_multiplier`, `enable_advancement`, and `trigger_decline`. Band tables must start at `0` and list strictly ascending, non-overlapping minima.
- Population tiers gain `satisfaction: { aggregation?, bands? }`; the residence resolves its tier's band table and aggregation.
- Phase 22 evaluates every residence's band from its Z and writes authoritative `bandState` (band index, resolved effects, decline grace counter). The decline grace counter advances while the band carries `trigger_decline` and resets when the band changes (GDD-12.6: the grace period is a sustained-condition timer).
- Phase 23 uses the band's `growth` effect policy in place of the tier's growth policy while the residence is in that band; phase 26 scales normal-storage income by the band's `output_multiplier` for the resource. `enable_advancement` and `trigger_decline` are recorded for 7.3's transition engine.
- `checkInvariants` gains INV-09: every residence with a band table and a satisfaction value has band state whose band contains its Z.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `sim/needs`: band evaluation, effects, and INV-09.
- `content/schemas`: the `satisfaction_bands` collection and the tier `satisfaction` object.

## Impact

- **Packages:** `@aesfw/content` (band schema, references), `@aesfw/core` (band evaluation, growth override, income multiplier, `Residence.bands`), `@aesfw/app` (tier resolution), `@aesfw/testkit` (INV-09).
- **Tick phases:** phase 22 `updateTimersAndBands` (reads `residence`, `satisfaction`, `bandState`; writes `bandState`), phase 23 `updatePopulation` (reads `bandState`), phase 26 `applyContinuousOutputsAndMaintenance` (reads `bandState`).
- **Store kinds:** `bandState` (already a v1 catalogue kind; values become populated). **Commands/events:** none new. **Error codes:** none. **Diagnostic codes:** `invalid_satisfaction_bands`.
- **Protocol/save format:** no change; `bandState` is already encoded and hashed. **HASH-CHANGING:** no — no shipped fixture defines band tables, so existing goldens are unchanged.
- **Dependencies on archived changes:** 7.1 `add-sustained-conditions` (archived 2026-10-23) and 4.1 `add-balance-resources-and-income` (archived 2026-10-22).

## Out of Scope

- 7.3 `add-tier-transitions`: consuming `enable_advancement` and `trigger_decline` to start transitions, and validating that a named decline transition's source tier matches the band's users.
- 7.7 `add-transition-eligibility-read-model`: exposing the band and grace progress in projections.
- 7.9 `add-client-population-and-transitions`: band display in the client.
