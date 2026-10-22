# Design — add-core-read-models

## Context

`add-projections-and-deltas` (2.3) is archived: `WorldReader`, `project`, and `diffProjection` exist, and the M2 read-model DTOs are defined in `@aesfw/protocol`. PIC-4 and PIC-10.1–10.3 define the read models. This document records only decisions those sections leave open.

## Goals / Non-Goals

**Goals:** definition metadata, entity detail, location summary, and need breakdown.

**Non-Goals:** transport detail, planning metrics, owner economy, exchange quotes (6.6, 4.4, 4.5, 9.3); fog filtering (8.4).

## Decisions

### D1 — Module layout

`packages/app/src/readmodels/` holds `metadata.ts`, `entity-detail.ts`, `location-summary.ts`, `need-breakdown.ts`, and `index.ts`, all exported from `@aesfw/app`.

### D2 — Definition metadata

`definitionMetadata(content, type)` casts the registry to `ContentRegistry`, iterates `definitionsOf(type)`, and maps each to `{ definition_id, definition_type, tags: tagsOf(id), parameters: data-as-object, commands: [] }`. Unlock-based command availability is M7.

### D3 — Entity detail

`entityDetail(session, entity)` returns `null` unless the entity has a `definition` component, a producer, or a residence. `enabled` defaults to `true` and `lifecycle` to `active` when the components are absent. `available_commands` is the four command types of 2.2. Production reuses the projection mapping; residence population/satisfaction come from the `populationGroup` and `satisfaction` components, and `band` is empty until bands land in 7.2.

### D4 — Location summary

`locationSummary(session, actor, location)` sums inventory `quantity` per resource string ID, sums population `count` per tier string ID over entities whose producer or residence location is `location`, and counts those entities. `connections` is empty until 3.4.

### D5 — Need breakdown

### D5 — Need breakdown

`needBreakdown(session, entity)` maps the residence's `needs` against the `needStates` runtime and the `satisfaction` categories. `delivered` is the latest window value; `fulfillment` is `1000` when demand is `0`, otherwise `min(1000, floor(delivered × 1000 / demand))`. These are derived values and are never written back.

## Amendments and clarifications to 01–07

- None.

## Risks / Trade-offs

- [Read models return derived values] → they are computed per call and never feed back into authoritative state (ARCH-8.2).
- [Missing runtime components] → each read model defaults sensibly (`enabled` true, empty arrays) so partially instantiated worlds still render.

## Migration Plan

Additive app modules. No goldens change. Rollback is reverting the change.

## Open Questions

None blocking.
