# Design

## Context

The client renders projections, read models, and definition metadata only (04 §9/§10; REF-14). The entity detail read model carries transition eligibility (7.7); location summaries carry `population_by_tier`; definition metadata exposes the `service_provider` parameters (PIC-4).

## Goals / Non-Goals

- Goals: pyramid, checklist + transition command, lock toggles, coverage overlay, R3 partial content.
- Non-Goals: reference balancing, exchange/fog views, new protocol fields.

## Decisions

### D1 — View state

`V` toggles a `population` drawer (joining `E` economy, `P` planning, `L` logistics) and `O` toggles a `coverage` overlay (joining `C`, `S`, `T`). Both are client-local and follow the existing `drawerAction`/`toggleOverlay` pure functions.

### D2 — Selectors

`tierPyramid(summaries)` orders locations and tiers by ID; `residenceChecklist(detail)` reads `detail.residence.transition_eligibility`; `coverageOverlay(projection, metadata)` reads `service_provider` from metadata parameters and joins it with entity spatial data. All are pure and unit-tested.

### D3 — Commands

The drawer's Advance and Lock/Unlock buttons and the inspector's Advance button use the existing `SessionClient.command` path with `RequestPopulationTransition` and `SetResourcePurposeLock`. No client-side mechanics are computed; eligibility comes from the read model.

### D4 — Coverage overlay

The overlay draws provider radii from metadata rather than projecting coverage relations, so no protocol change is needed. The provider's relation must be explicit in content for a radius to render; the reference content does not use coverage providers in v1, so the overlay is exercised by the selector tests and future content.

### D5 — R3 partial content

`ref.tier` gains tier S2 (credits output only), its need/category, `ref.tier.transition.s1_s2` and `ref.tier.transition.s2_s1`, the S2 residence definition (initial population 0), a default band table, and the S2 residence in the R2 world's initial entities. Reference codes stay inside `reference/**`.

## Clarifications recorded (no normative amendment)

- The coverage overlay is metadata-derived and renders nothing for providers without an explicit relation.
