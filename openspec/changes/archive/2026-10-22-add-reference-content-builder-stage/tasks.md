# Tasks

## 1. Reference content (design D1–D5)

- [x] 1.1 Rescale the storable resources `ref.tier.resource.p1`, `p2`, `h1`, `c1` to scale `6000`, add the 07 §7 B.2 role tags and `complexity: 1` on `c1`, and add the construction resource `ref.tier.resource.bm1`.
- [x] 1.2 Replace `ref.tier.location.a` with the R1 grid location template (40×40, buildable ratio 400–700, suitability `ref.tier.property.suitability_p1` `1000`, source slot `ref.tier.slot.v_a` count `2`, shared inventory, `activation.initial: true`).
- [x] 1.3 Update `ref.tier.recipe.refine` (`30` ticks, `6000` `p1` + `6000` `p2` → `6000` `h1`) and `ref.tier.recipe.combine` (`30` ticks, `12000` `h1` → `6000` `c1`).
- [x] 1.4 Add the slot extractor, area extractor, refiner, and connector entity definitions with their `resource_source`, `placement`, `producer`, and `connectivity` components; remove the R0 infinite sources.
- [x] 1.5 Update `ref.tier.presentation` localization entries and the `formatting.base_scale` to `6000`.

## 2. Reference content tests (design D1)

- [x] 2.1 Add `reference/content/test/ref-tier.test.ts` validating the package through `loadContent` with strictness `strict`. [REF-5]
- [x] 2.2 `[REF-5] the reference content validates strictly` — no error diagnostic and a non-null registry.
- [x] 2.3 `[REF-5] the reference content defines the closed loop` — recipes `refine` and `combine` and the `c1` need exist.
- [x] 2.4 `[REF-5] every storable resource uses the reference base scale` — `p1`, `p2`, `h1`, `c1`, `bm1` declare scale `6000`.
- [x] 2.5 `[REF-7] the grid location declares its geometry, property, and slot` — width `40`, height `40`, buildable ratio `400`–`700`, `suitability_p1` `1000`, `v_a` count `2`.
- [x] 2.6 `[REF-7] BM1 is a construction resource` — storable, transportable, scale `6000`, tag `ref.tier.role.construction`.
- [x] 2.7 `[REF-7] the slot extractor declares a slot-dependent source` — policy, output `p2` `400`, `requires_slot`.
- [x] 2.8 `[REF-7] the area extractor declares a property-scaled source` — policy, `scale_by_property`, working area `12` exclusive.
- [x] 2.9 `[REF-7] the refiner declares the refining recipe` — `refine` inputs/outputs and duration.
- [x] 2.10 `[REF-7] the connector provides the hub network` — `provides` and no producer.
- [x] 2.11 Add the `reference-content` Vitest project and `reference/content/tsconfig.json`.

## 3. Verification

- [x] 3.1 Run `aesfw validate reference/content/ref.tier --strict`; exit `0`. [REF-5]
- [x] 3.2 Run the reference content headlessly for `100` ticks; no findings. [REF-5, GDD-23.1]
- [x] 3.3 Confirm no framework package, fixture, or golden change. [REF-5]

## 4. Documentation and verification

- [x] 4.1 Review `docs/08_Implementation_Roadmap.md`; mark row 3.6 done at archive.
- [x] 4.2 Confirm no amendment to 01–07 is required (design).
- [x] 4.3 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. [REF-5, REF-7]

## Workflow follow-up

- Run `/opsx-verify`, then `/opsx-sync` and `/opsx-archive`.
- At archive, mark roadmap row 3.6 with "✓ archived <date>" in `docs/08`.
