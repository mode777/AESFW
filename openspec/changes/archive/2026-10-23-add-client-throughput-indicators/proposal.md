# Proposal

## Why

Roadmap 08, M5 item 5.4 (`add-client-throughput-indicators`). The simulation now throttles internal logistics and storage providers expand it, but the client cannot show why a chain is slow or that over-densification is the cause. This change surfaces the location throughput pool and throttled entities in the grid, and adds the R1 storage module so the player has a visible counter-play, retiring the R-08 legibility gap that the throughput limit is invisible.

## What Changes

- The location snapshot and location summary gain a populated `throughput` DTO (`capacity`, `requested`, `throttle_permille`) derived from the location's throughput pool.
- The client grid gains a throughput gauge (capacity, requested, pressure) and a `T` overlay that highlights throttled entities; the existing inspector block-reason row already names `throughput_throttled`.
- `GridOverlay` and the keyboard map gain `throughput` (`T`).
- The R1 reference content gains a storage module entity (`storage_provider` capacity + throughput, maintenance, placement, connectivity) and the reference location declares a base throughput, so building storage is the visible counter-play.
- Client selector and view-state tests for the gauge, overlay, and key handling; projection tests for the DTO.

## Capabilities

### New Capabilities

### Modified Capabilities

- `reference/client`: ADDED requirement — throughput gauge, throughput overlay, and throttle display.
- `app/projections`: ADDED requirement — location throughput DTO.
- `reference/content`: ADDED requirement — the R1 storage module and the reference location's base throughput.

## Impact

- **Packages:** `@aesfw/app` (projection and location summary), `@aesfw-ref/client-web` (selectors, view state, grid view, i18n keys), `@aesfw-ref/content` (R1 storage module and location throughput).
- **Tick phases:** none — the client reads published snapshots/read models.
- **Store kinds:** reads `throughputPool`; no new kinds.
- **Commands/events/error codes/diagnostics:** none.
- **Protocol/save format:** no shape change; `ThroughputDto` already exists. **Not hash-changing:** projections and reference content do not affect authoritative state; the reference content change affects only the reference session.
- **Dependencies on archived changes:** 5.2 `add-storage-providers` (archived 2026-10-23), 3.7 `add-client-location-grid` (archived 2026-10-22).

## Out of Scope

- 6.8 `add-client-world-map` and 6.9 `add-client-route-editor`: world-map and logistics views.
- 7.9 `add-client-population-and-transitions`: population and coverage overlays.
- 5.3 `add-golden-throughput-throttling`: already archived; this change does not touch its fixture or golden.
- Reference R2/R3 content stages.
