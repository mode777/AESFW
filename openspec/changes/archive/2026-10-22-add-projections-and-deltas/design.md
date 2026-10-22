# Design — add-projections-and-deltas

## Context

`add-session-and-command-gateway` (2.2) is archived: `SessionState`, `submitCommand`, and `advance` exist, and `@aesfw/protocol` has the snapshot and delta DTOs. TDS-10.2 defines `WorldReader`; TDS-18.4 and PIC-9/PIC-18 define projections, deltas, and resync. This document records the decisions those sections leave open.

## Goals / Non-Goals

**Goals:** a `WorldReader` facade, per-actor full projections, delta computation, delta application (P-10), and the resync rule.

**Non-Goals:** fog filtering (8.4); read models (2.4); save/load (2.5); the worker host (2.6).

## Decisions

### D1 — `WorldReader` in core

`packages/core/src/world/reader.ts` adds `readWorld(world, registry): WorldReader`. Accessors: `tick`, `ownerHandles`, `locationIds`, `entityIds` (all store entities except `location` and `inventory`, ascending), `owner`, `accounts`, `knowledge`, `location`, `locationHub`, `inventory`, `definition`, `revision`, `lifecycle`, `enabled`, `producer`, `reservations`. It returns authoritative component values as readonly views (no copies); the application layer must not mutate them.

### D2 — `project`

`packages/app/src/projections/project.ts` adds `project(session, actor): SnapshotDto`. It builds:
- `owners`: one `OwnerDto` per owner handle (ascending), `owner_id` = `registry.stringIdOf('owner', handle) ?? 'owner.<handle>'`, `resources` keyed by resource string ID from the owner accounts.
- `locations`: one `LocationDto` per location entity (ascending): `definition_id` from the location template, `owner_id`, `knowledge` (`established` for the session actor until fog in 8.4), `active`, `properties` (tags/region/values), and `inventories` with entries (`stored` = quantity, `reserved` = sum of non-capacity ledger reservations for that inventory+resource, `capacity` = per-resource or total).
- `entities`: one `EntityDto` per reader entity id (ascending): `definition_id` when a `definition` component is present, `location_id`, `revision`, `lifecycle`, `spatial` when a transform is present, `production` from the producer.

`configuration_checksum` is `session.content.checksum`; `revision`/`tick`/`session_id` come from the session.

### D3 — `diffProjection`

`packages/app/src/projections/diff.ts` adds `diffProjection(prev, next): SnapshotDeltaDto`. For every entity id present in both, it compares each top-level field (`definition_id`, `location_id`, `revision`, `lifecycle`, `spatial`, `production`) and emits `{ entity_id, component: <field>, fields: { [field]: <new value> } }` when it differs. For every inventory entry present in both, it emits `{ inventory_id, resource_id, stored, reserved }` when `stored` or `reserved` differs. Entities or entries present in only one side are out of scope in M2 (no construction yet); the diff ignores them.

### D4 — `applyDelta` and P-10

`packages/protocol/src/delta.ts` adds `applyDelta(base, delta): SnapshotDto` and `canApplyDelta(base, delta): boolean`. `applyDelta` clones `base`, then for each `entity_update` sets `entity[component] = fields[component]`, and for each `inventory_update` sets the matching entry's `stored`/`reserved`; it sets `revision = to_revision` and `tick = delta.tick`. Because D3 emits the full new value per changed field, `applyDelta(p_n, diffProjection(p_n, p_{n+1}))` deep-equals `p_{n+1}` (P-10). `canApplyDelta` returns `delta.session_id === base.session_id && delta.from_revision === base.revision`.

`applyDelta`/`canApplyDelta` live in protocol so the reference client (which may import only protocol) can apply deltas. Protocol gains no dependency.

### D5 — Definition references

Entity `definition_id` is emitted only when the entity has a `definition` component. The M1 scenario instantiation does not set that component, so entity `definition_id` is absent until the app instantiates content (worker host, 2.6). Location `definition_id` always comes from the location template. Projections are therefore complete for owners, locations, and inventories now, and for entity definitions once 2.6 lands.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [No entity removal in deltas] → M2 has no construction or deconstruction; the removal case arrives with 3.2 and extends the delta DTO then.
- [Entity `definition_id` deferred] → D5 records it; the projection already reads the component, so no API change is needed later.

## Migration Plan

Additive core, protocol, and app modules. No goldens change. Rollback is reverting the change.

## Open Questions

None blocking.
