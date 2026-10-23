# Design

## Context

`ThroughputDto` (`capacity`, `requested`, `throttle_permille`) already exists in `@aesfw/protocol`, and `LocationDto`/`LocationSummaryDto` both carry an optional `throughput` field, but no producer populates it. The client grid already has `GridOverlay = 'connectivity' | 'suitability' | null`, a `toggleOverlay` function, and `stateEncoding` maps `throughput_throttled` to the `throttled` state with glyph `T`. Reference content has no storage module and its location has no `internal_logistics`.

## Goals / Non-Goals

- Goals: populate the DTO, render a gauge and overlay, make the throttle visible without computing mechanics, and add the R1 storage module.
- Non-Goals: world-map/logistics views (M6), population/coverage overlays (7.9), new protocol shapes.

## Decisions

### D1 — DTO source

`project()` reads `world.stores.get<ThroughputPool>('throughputPool').get(location)` and emits:

```ts
throughput: {
  capacity: pool.capacity,
  requested: pool.requested,
  throttle_permille: pool.throttlePermille,
}
```

The location summary read model does the same, so both client surfaces agree. A location without a pool omits the field; the client renders no gauge. No mechanics are computed in the app or client (PIC-2.2): the pool is authoritative state published by phase 10.

### D2 — Client gauge selector

`throughputGauge(location: LocationDto): ThroughputGauge | null` returns:

- `capacity`, `requested`, `throttlePermille` from the DTO;
- `pressurePermille = floor(1000 × requested / capacity)` (`1000` when capacity is `0` and requested is `0`; `1000` when capacity is `0` and requested is positive);
- `throttled = throttlePermille < 1000`.

The selector is pure and unit-tested; it does not read the world.

### D3 — Overlay and view

`GridOverlay` gains `'throughput'`. `toggleOverlay` maps `T`/`t` to it and clears it when already active, matching `C`/`S`. The grid view:

- draws a gauge bar at the top-left of the SVG (`data-testid="throughput-gauge"`) with width proportional to `pressurePermille` and a `data-throttled` attribute;
- when the throughput overlay is active, adds `throttled` to entities whose `production.block_reasons` include `throughput_throttled` and dims the rest (`data-testid="throughput-throttled-<id>"`);
- sets the legend text to capacity, requested, and throttle permille.

The inspector already shows every block reason, so no new inspector row is needed; the existing `throughput_throttled` row is the throttle display.

### D4 — R1 storage module

`ref.tier.location.a` gains:

```yaml
internal_logistics:
  policy: framework.inventory.throughput_limited
  base_throughput: 6000
```

A new `ref.tier.entity.storage_module` declares `storage_provider` (`inventory: location.shared`, `capacity.total: 1800000`, `throughput: 2000`), maintenance (`credits` every 60 ticks), placement (`footprint: [2, 2]`), and connectivity (`requires: ref.tier.connectivity.hub_network`). The values follow REF Appendix B (hub 6000, +2000 per module; hub storage 3,000,000, +1,800,000 per module). The client shape grammar already maps `storage_access` to `storage_module`; the metadata now also carries `storage_provider`, so `archetypeOf` is extended to recognise it (keeping the existing `storage_access` path).

### D5 — Hash and test impact

The projection and client changes are not hash-changing. The reference content change only affects reference sessions, not the framework fixtures or goldens. `ref-tier.test.ts` validates the package; it must still pass. The client selector tests use DTO fixtures, so they stay pure.

## Risks / Trade-offs

- [A zero-capacity location makes pressure ambiguous] → `pressurePermille` is `1000` when capacity is `0` and requested is positive, and `0` when both are `0`; the gauge shows full pressure only when there is unsatisfied demand.
- [The reference location becoming throughput-limited changes the reference session] → intended R1 behaviour; the framework goldens are unaffected.
- [The overlay only knows per-entity throttling through block reasons] → correct for the current protocol; a per-entity throttle DTO is out of scope.

## Migration Plan

No save or protocol migration. Existing snapshots without `throughput` still validate (the field is optional). Reference content is additive.

## Open Questions

None.
