# Design

## Context

`alloc-v1` already exists in `@aesfw/core/fx` and is tested. `throughputPool` and `throughputAllocation` are already store kinds in the v1 catalogue but have never been populated. Phases 09 and 10 are registered no-ops. Production (07, 11–13) and needs (08, 20) already move quantities but have no throughput input. Location templates have no `internal_logistics` field.

## Goals / Non-Goals

- Goals: a deterministic, content-configured throughput limit; proportional allocation with the existing `alloc-v1`; throttling that every movement phase obeys; INV-06.
- Non-Goals: storage-provider expansion (5.2), the SCN-10 golden (5.3), client indicators (5.4), transport handling requests (M6), explicit internal transport (phases 14–15).

## Decisions

### D1 — Location throughput configuration

`LocationTemplateSchema` gains optional `internal_logistics`:

```yaml
internal_logistics:
  policy: framework.inventory.throughput_limited
  base_throughput: 6000
  base_throughput_capability: test.capability.throughput
```

`base_throughput` is the location's configured base (non-negative integer). `base_throughput_capability` is optional; when present, the location-scoped capability supply for that handle (phase 05 scratch, or a rebuild fallback) is added. Supporting both fields follows the CONT-6.4 example, which names the capability field, while giving content a numeric base the hub (GDD-9.9) provides. A location without `internal_logistics` is unbounded, preserving every existing fixture and golden.

`LocationPlan` carries the same three fields; `instantiateWorld` writes a `throughputPool` component for a throughput-limited location with `policy`, `baseCapacity`, and `capacity` equal to the base. The pool is keyed by the location entity, matching TDS-8.3.

### D2 — Request collection (phase 09)

Phase 09 walks producers, sources, and residences in ascending entity ID and writes a `readonly ThroughputRequest[]` to scratch (`throughputRequests`). Each request is `{ entity, location, quantity }`.

- Source: the planned output quantity for the tick. It reuses `advanceSource` in a pure planning mode (no mutation) so area scaling and finite-deposit limits match phase 12 exactly.
- Producer: the sum of planned inputs and planned outputs, counted only when the process moves this tick. A batch process moves on its completion tick (`progress + 1 >= duration`); a continuous process (effective duration `1`) moves every tick, including the tick it starts. A batch process that merely starts reserves inputs but moves nothing, so it requests nothing.
- Residence: the sum of `resource_consumption` demands written by phase 08. Availability needs move nothing and request nothing.
- Exclusions: disabled, deficit-paused, blocked producers/sources, and inactive locations. This mirrors the phase 07/11 exclusion rules.

Scratch keeps the phase pair typed without saving anything (TDS-11.2).

### D3 — Allocation (phase 10)

For every `throughputPool` in ascending location entity ID:

1. Recompute `capacity = baseCapacity + Σ location-scoped capability supply + Σ storage-provider throughput` (the last term is added by 5.2).
2. Gather the requests at that location in ascending entity ID.
3. Call `allocate(capacity, requests)` (`alloc-v1`, TDS-6.3). This gives the ordering, floor division, and remainder-by-entity-ID rule directly.
4. Write `throughputAllocation` for each requester: `{ location, requested, granted, throttlePermille }`.
5. Update the pool: `requested`, `capacity`, and `throttlePermille = floor(1000 × grantedTotal / requested)` (`1000` when `requested = 0`).
6. Emit `ThroughputThrottled` per requester with `throttlePermille < 1000`, in ascending entity ID.

A requester with no allocation (unbounded location) is treated as throttle `1000` by the movement helpers. The pool and allocation are authoritative and therefore hashed; they are recomputed every tick.

### D4 — Throttled movement (phases 11–20)

A shared helper `throttlePermilleOf(world, entity)` reads `throughputAllocation` and defaults to `1000`. Movement scales with `floor(planned × throttle / 1000)` via `mulDiv(..., 'floor')`.

- Phase 12: `advanceSource` takes the throttle and reduces the deposit by the scaled amount (not the planned amount); producer progress is clamped to `effectiveDuration`.
- Phase 13: for each input reservation, commit the scaled quantity and release the remainder; if the scaled quantity is `0`, release only. Deposit scaled outputs. A producer with throttle `0` does not complete: it stays `processing` at its duration, keeps its reservations, and reports `throughput_throttled`. A throttled completion emits no extra block reason because it returns to `idle`; the `ThroughputThrottled` event and the throughput read model carry the fact.
- Phase 20: scale the delivery by the residence's throttle before consuming or testing availability.
- Phase 11 is unchanged: it reserves the full recipe amounts (all-or-nothing start, GDD-4.3). The throttle is a movement constraint, not a reservation constraint, so a partially granted process still holds its full input reservation until completion.

### D5 — INV-06

`checkInvariants` reads `throughputAllocation` grouped by location and compares each group to the `throughputPool` capacity and each allocation's request. Exact share comparison uses `capacity × request / totalRequest` as a rational; the integer grant must be within `[floor(share), ceil(share)]` and at most the request. A missing pool or allocation produces no finding.

## Risks / Trade-offs

- [A batch process can hold full input reservations while throttled] → accepted; reservations are not movement, and releasing them early would break all-or-nothing starts.
- [Throttle `0` can leave a producer processing indefinitely] → correct under a persistent zero capacity; a storage provider or a freed request restores progress.
- [Capability supply is read from scratch, which phase 10 can run without] → fallback rebuild keeps `runPhases([9,10])` tests valid.
- [The CONT-6.4 example names only `base_throughput_capability`] → both fields are supported; no document change is required and the numeric base is additive.

## Migration Plan

No save-format or protocol change: both stores already exist in the v1 catalogue. Worlds without `internal_logistics` encode the two stores as empty arrays exactly as before, so existing goldens are unchanged. Content that opts in changes hashes, which is expected and covered by 5.3's new golden.

## Open Questions

None.
