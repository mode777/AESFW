# Design — add-spatial-projection-data

## Context

See proposal.md — Why. The kernel already carries everything the client grid needs: `Location.grid` (`LocationGrid`, `packages/core/src/sim/location.ts`), `LogicalTransform` and `Footprint` stores (`packages/core/src/sim/spatial.ts`), and `ConnectivityNode` plus `isConnected` (`packages/core/src/sim/connectivity.ts`). The per-actor projection (`packages/app/src/projections/project.ts`) reads only `location`, `locationHub`, `inventory`, `definition`, `revision`, `lifecycle`, and `producer`; it already reaches into `world.stores` directly for `residence` in `locationOfEntity`, so the same pattern can read the spatial and connectivity stores. `EntityDto.spatial` is declared in `packages/protocol/src/snapshot.ts` but never filled, `LocationDto` has no grid field, and connectivity is absent from the DTOs entirely. `04` §9.1 shows `spatial: { logical_position, orientation }`; §10.2 requires a location capacity/topology summary and connections. This document records the wire shapes, the projection wiring, and the codec/delta extension only; no kernel semantics change.

## Goals / Non-Goals

**Goals:** optional `grid` on `LocationDto`, optional `footprint` on `SpatialDto` with a populated `EntityDto.spatial`, optional `connectivity` on `EntityDto`, matching codec support, and connectivity in the projection delta — all additive within protocol version `1`.

**Non-Goals:** the client grid (3.7/3.8), fog filtering (8.4 `add-fog-filtered-projections`), transport connections and inter-location topology (M6), throughput (M5), source-slot and working-area summaries (CONT-6.4, owned elsewhere), and any change to the 3.1/3.3/3.4 kernel.

## Decisions

### D1 — Additive optional fields, no protocol version bump

`LocationGridDto = { width: WireInt; height: WireInt; blocked: readonly WireInt[] }`, `FootprintDto = { width: WireInt; height: WireInt }`, and `ConnectivityDto = { role: string; network: WireId; connected: boolean }` are added as optional fields (`LocationDto.grid?`, `SpatialDto.footprint?`, `EntityDto.connectivity?`). `SpatialDto` already exists with `logical_position` and `orientation`; `footprint` extends it rather than adding a parallel object. Every field is optional, exactly as `2.3`/M2 treated additive wire fields, so `PROTOCOL_VERSION` stays `1` and an old decoder ignoring them still validates. Alternatives rejected: a version bump (unnecessary for additive optional fields, and it would break the "additive fields are minor" rule in `packages/protocol/src/version.ts`), and a single combined `spatial` carrying connectivity (connectivity is a distinct concern and the client overlays it separately).

### D2 — Projection wiring

`project.ts` gains three small builders, all read-only over the world's stores and pure:

- `locationDto`: when `location.grid !== undefined`, set `grid` with `blocked: [...location.grid.blocked]` (a fresh ascending copy; the core guarantees ascending packed indices).
- `entityDto`: read `world.stores.get<LogicalTransform>('transform').get(id)` and `world.stores.get<Footprint>('footprint').get(id)`; when a transform exists, set `spatial.logical_position = [position.x, position.y]`, `spatial.orientation`, and `spatial.footprint` only when a footprint exists.
- `entityDto`: read `world.stores.get<ConnectivityNode>('connectivityNode').get(id)`; when present, set `connectivity = { role, network: node.network, connected: isConnected(world, id) }`. `node.network` is a `StringId` (a branded string), so it is emitted directly with no registry lookup.

The stores are read directly, mirroring the existing `residence` read in `locationOfEntity`, rather than widening `WorldReader`: the reader is the fog-aware boundary that row 8.4 will change, and adding spatial accessors now would pre-empt that design. Iteration order is unchanged (ascending location and entity ID from `reader.locationIds` / `reader.entityIds`).

### D3 — Delta tracks connectivity

`diff.ts` `ENTITY_FIELDS` already lists `spatial`; it gains `connectivity` so a connectivity change produces an `entity_update` with component `connectivity`. `applyDelta` is generic (`entity[component] = fields[component]`) and needs no change. No other field ordering changes, so deltas remain deterministic.

### D4 — Codec extension

`codecs/snapshot.ts` decodes the new optional fields. It previously ignored `spatial` entirely, so a `decodeSpatial` helper now decodes `logical_position` (a two-integer tuple), `orientation`, and the optional `footprint`; `decodeConnectivity` decodes `role` (string), `network` (string), and `connected` (boolean); `decodeLocation` decodes the optional `grid` with an integer `width`, integer `height`, and an integer `blocked` array (reusing the `isIntegerArray` guard). A present-but-malformed field yields `protocol.invalid_field` at its path; an absent field is simply omitted. Snapshots that omit all three still decode unchanged. `@aesfw/protocol` gains no runtime dependency.

### D5 — Purity, encoding, and hashes

The projection and codecs stay pure: no clock, RNG, global, floating point, async, or module-level mutable state. All emitted numbers are the authoritative safe integers. Projections are derived and never written back, so no save, store encoding, fixture, or golden hash changes; no versioned algorithm tag is bumped.

## Risks / Trade-offs

- [The projection reaches into core stores by string kind instead of through `WorldReader`] → this already happens for `residence` and avoids pre-empting the 8.4 fog-aware reader; the kinds are in the TDS-8.3 catalogue and are asserted by the type parameter.
- [A client could mistake `connectivity.connected` for a placement decision] → `connected` mirrors the read-only `isConnected` query; placement validity remains authoritative through `PlacementQueryDto` (PIC-12.1).
- [Grid geometry is exposed even when fog would hide the location] → this change applies no fog filtering, matching the existing "Fog filtering is not applied in this change" note; row 8.4 filters every projection field, including these.
- [A large `blocked` array inflates the snapshot] → acceptable for M3; a later row can introduce a partitioned or delta-friendly encoding without changing the DTO shape.

## Migration Plan

Additive optional DTO fields, projection population, and codec decoding. No save-format, protocol-version, or golden artifact changes. Rollback reverts the change; older decoders ignore the new optional fields.

## Amendments and clarifications to 01–07

- None. PIC-9.1 and PIC-10.2 already require the projection data; 04's example snapshot is illustrative and leaves later-row fields optional (`packages/protocol/src/snapshot.ts` TSDoc). This change implements the existing contract rather than amending it.

## Open Questions

None blocking.
