# Design — add-reference-content-seed

## Context

1.15 (golden basic loop) is archived, so the loader, schemas, and scenario runner exist. 07 §5 defines the R0 seed and 07 §4 fixes the time and scale conventions. This document records the R0 content choices.

## Goals / Non-Goals

**Goals:** the `ref.tier` R0 seed and the `ref.tier.presentation` skeleton.

**Non-Goals:** R1–R4 content (3.6, 6.8, 11.1, 11.5), reference scenarios and balance runs (11.2, 11.3).

## Decisions

### D1 — Package layout

`reference/content/ref.tier/package.yaml` + `content.yaml` (one file for the small R0 seed; later stages split per 07 §6). `reference/content/ref.tier.presentation/package.yaml` + `localization.en.yaml`, `mappings.yaml`, `formatting.yaml`.

### D2 — R0 definitions

- Location `ref.tier.location.a` (`framework.spatial.abstract_capacity`, `total_capacity: 100`, one `shared` inventory, `activation.initial: true`).
- Resources `p1`, `p2` (primary, storable), `h1` (intermediate), `c1` (consumer), and capability `ref.tier.capability.s1`.
- Recipes `ref.tier.recipe.refine` (`p1 + p2 → h1`, batch) and `ref.tier.recipe.combine` (`h1 → c1`, batch), each requiring `ref.tier.capability.s1`.
- Tier `ref.tier.population.s1` (consumption factor `1000`, output capability `s1`, category `b1`), category `ref.tier.need_category.b1` (mode `all`), need `ref.tier.need.c1` (consumes `c1`).
- Growth policy and condition mirroring the basic-loop fixture.
- Entities: sources for `p1` and `p2`, a refiner, a combiner, and a residence.

### D3 — Scales

Per 07 §4, the R0 seed uses base scale `1000` and tick duration `1000` ms (conventions fixed for the reference; R0 does not yet use the 6000 base scale, which arrives with R1 balance). Display names are codes.

## Amendments and clarifications to 01–07

- None. R0 is a subset of 07 §5.

## Risks / Trade-offs

- [R0 uses scale 1000, not 6000] → the 6000 scale is a balancing convention for R1+; R0 only needs the loop to close.
- [No automated reference test] → validated with `aesfw validate --strict` and a headless run; reference test packages arrive with 11.2.

## Migration Plan

Additive reference data. No framework or golden change. Rollback is reverting the change.

## Open Questions

None blocking.
