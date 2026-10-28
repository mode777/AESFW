# Tasks

## 1. Content — world, regions, start state

- [x] 1.1 Finish `world.yaml`, `regions.yaml`, `distribution.yaml`, and `locations.yaml` for the six-location R3 world with disjoint α/β distribution rules and the seeded `world_generation` stream (07 §7 B.1); verify by loading the package and checking the [REF-5] prototype counts (6 locations, 4+2 regions split).
- [x] 1.2 Author the start state: owner establishes `alpha_1`, knows `alpha_2` and the α exchange, initial entities and stocks per design D2; verify with a headless 600-tick run whose satisfaction stays ≥ 800 [REF-5, GDD-23.5].
- [x] 1.3 Complete `resources.yaml` (P1–P4, H1–H2, C1–C4 with complexity, BM1–BM2, EP, credits) with role tags and scale 6000; verify with a loader assertion per [REF-7 B.2] tag.

## 2. Content — population, needs, bands, transitions

- [x] 2.1 Author `population.yaml` (S1/S2 capacities, AK1/AK2 exact outputs, income 10/25, factors 1000/1500, active categories) and `needs.yaml`/`templates.yaml` (B1/B2 weighted categories, B3 coverage); verify [REF-7 B.4/B.5] loader assertions.
- [x] 2.2 Author `satisfaction.yaml` bands (thresholds 800/500/250, growth 8, grace 60, emigration 4, multipliers, empty decay); verify against the band table test [REF-7 B.6].
- [x] 2.3 Author `transitions.yaml` (new-S1 6 BM1; S1→S2 10 BM1 + 6 BM2, unlock 150 S1, sustained 60, `automatic_when_eligible`; decline unrefunded clamping) and `unlocks.yaml` (combiner and coverage service at 150 S1); verify the [REF-7 B.7] automatic-eligibility and purpose-lock gating tests.

## 3. Content — economy, transport, exchanges, establishment

- [x] 3.1 Author `entities.yaml`/`recipes.yaml` for the remaining R3 archetypes (combiner 4×4 25 AK2, coverage service 4×4 radius 18 15 AK2, storage module, hub-throughput definition) with B.3 maintenance converted per 07 §4; verify loader assertions [REF-7 B.3].
- [x] 3.2 Author `transport.yaml` (T1: 2 typed slots × 300000, speed 1000, cost 40 BM1 + 20 BM2, maintenance 25/min) replacing the R2 `basic` class; verify [REF-7 B.8] assertions.
- [x] 3.3 Author `exchanges.yaml` (one per region, §4 elasticity verbatim), `economy.yaml` (deficit policy), and `establishment.yaml` (1 EP); verify [REF-7 B.9] assertions including CONT-6.21 bounds.

## 4. Presentation package

- [x] 4.1 Replace `localization.en.yaml` with the staged `.new` catalogue and extend it to cover every R3 definition, `.description`, both `.unlock_hint` entries, and category names; verify the PIC-19 presentation validation `--against ref.tier` passes.
- [x] 4.2 Complete `mappings.yaml` (`display.category_key` per tier, `sort_order`, `fallback_shape` per REF-10.2) and `formatting.yaml` (scale 6000, tick 1000 ms, `/min`); verify mapping coverage by test [REF-6, PIC-6].

## 5. Repairs and tests

- [x] 5.1 Rework `reference/content/test/ref-tier.test.ts` to read the per-domain files in `package.yaml` order instead of `content.yaml`; verify the suite passes.
- [x] 5.2 Update `reference/client-web/src/content/r0.ts` to bundle the split files (raw imports enumerated) so the client build succeeds again; verify `pnpm --filter @aesfw-ref/client-web build`.
- [x] 5.3 Add reference tests for every spec scenario: strict + design-intent-promoted validation, prototype counts, disjoint regions, start state, role tags, tiers, coverage category, automatic advancement, purpose-lock gating, decline refund/clamp, maintenance, exchanges, T1 [REF-5, REF-7, GDD-23.5].
- [x] 5.4 Bump the package version to `0.4.0` and re-run `pnpm aesfw validate reference/content/ref.tier --strict` and the presentation check; both clean.

## 6. Documentation and verification

- [x] 6.1 Record the start-stock and EP-recipe numbers from design D2/D3 in the change design if tuning moved them; no 01–07 amendment is expected (design D7).
- [x] 6.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
