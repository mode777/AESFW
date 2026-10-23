# Proposal

## Why

Roadmap 08, M7 item 7.9 (`add-client-population-and-transitions`). The reference client can show population and needs but cannot show the tier pyramid, explain transition eligibility, request a transition, set a purpose lock, or display coverage — so the M7 mechanics are not playable or legible in the browser. This change adds those views plus the R3 partial content (S2), retiring the last legibility gap of R-08 for progression.

## What Changes

- Pure selectors: `tierPyramid` (per-location population by tier from location summaries), `residenceChecklist` (PIC-10.1 transition eligibility), and `coverageOverlay` (coverage circles derived from definition metadata).
- A population/progression drawer (`V`) showing the tier pyramid per location, the selected residence's transition checklist with sustained progress, and purpose-lock toggles for the selected location's inventory resources.
- The inspector's residence section lists transition eligibility entries and an Advance button issuing `RequestPopulationTransition`.
- A coverage grid overlay (`O`) drawing coverage radii from metadata, alongside the existing connectivity, suitability, and throughput overlays.
- R3 partial content (S2) in `reference/content/ref.tier`: tier S2, its need/category, advancement and decline transitions, and the S2 residence entity.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `reference/client`: the progression drawer, inspector checklist, coverage overlay, and their selectors.

## Impact

- **Packages:** `reference/client-web` (selectors, views, view state, main wiring), `reference/content/ref.tier` (S2 content).
- **Tick phases:** none (client-only, plus reference content).
- **Store kinds / commands / protocol:** no change; the client consumes existing projections, read models, metadata, and commands.
- **HASH-CHANGING:** no — reference content is not covered by framework goldens.
- **Dependencies on archived changes:** 7.7 `add-transition-eligibility-read-model` (archived 2026-10-23) and 4.7 `add-client-economy-and-planning` (archived 2026-10-22).

## Out of Scope

- 7.8 `add-progression-goldens` (archived) and M11 reference balancing.
- 8.x fog/regions UI, 9.x exchange UI.
