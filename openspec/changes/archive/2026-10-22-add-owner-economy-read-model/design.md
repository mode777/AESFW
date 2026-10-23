# Design

## Context

`OwnerBalanceDto` (snapshot) is defined but never populated; `diffProjection` only emits entity and inventory updates, so a populated balance would never reach a client after the first snapshot. The projection publishes a full snapshot once and deltas afterwards (`session-host.ts` `publish()`). Core already exposes the per-owner income and maintenance rate helpers from 4.3.

## Goals / Non-Goals

- Goals: one consistent data path for PIC-10.6; additive wire changes only; delta coverage so balances update live.
- Non-Goals: client rendering (4.7), planning metrics (4.5), exchange and transport sources (M9, 6.2), balance trend history (client-side).

## Decisions

### D1 — Rates are per tick

`revenue_per_interval`, `expenses_per_interval`, and `net_per_interval` carry **per-tick** rates (floored): revenue is generated per tick, maintenance is normalized per tick exactly as the deficit policy's net rate (4.3 D2). GDD-20.2's "per interval" is an aggregation window for presentation; the framework's common cadence is the tick, and using it keeps the read model consistent with the deficit policy that clients must explain. The field names stay as specified in 04 §9.1 (renaming would be a protocol break for no gain).

### D2 — Source keys

- `revenue_by_source`: `tier.<tier string id>` → population income of that tier's residences (all balance-resource outputs summed).
- `expenses_by_source`: `entity.<entity id>` → that entity's per-tick maintenance (Σ over input lines of `floor(quantity / intervalTicks)`).
- Totals are the sums of their maps, keeping the read model internally consistent.
- Multi-currency aggregation is lossy; v1 content has a single balance resource, and the limitation is recorded here (a per-resource split would change the DTO shape).

### D3 — Idle-but-paying

`idle_paying_entities` lists charging entities (per the maintenance charge policy, deficit-paused excluded) that have a producer component whose state is not `processing`. Entities without a producer (connectors, hubs) are ongoing costs, not "idle" processes, and are excluded.

### D4 — Delta transport

`SnapshotDeltaDto` gains optional `owner_updates: readonly OwnerDto[]` (full entries, same shape as the snapshot's `owners`); `diffProjection` compares the serialized owner entries and emits changed ones whole. Whole-entry updates keep the delta self-contained and the codec trivial at the cost of a few bytes per owner. The host worker posts deltas verbatim, so no host change is required; the client mirror applies them in 4.7.

## Risks / Trade-offs

- [Per-tick rates under the `per_interval` name could confuse clients] → documented here and in the spec text ("all rates are per tick"); the client labels scale for display.
- [Whole-entry owner updates grow deltas with many owners] → v1 is single-owner; M13 revisits when multi-owner lands.

## Migration Plan

Additive optional protocol fields; v1 codecs accept messages without them (PIC-3). Projections are not hashed — no golden impact.

## Open Questions

None.
