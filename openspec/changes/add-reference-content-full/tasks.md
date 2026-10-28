# Tasks

## 1. Resource and recipe catalogue

- [ ] 1.1 Extend `resources.yaml` to the full B.2 catalogue (P5–P8, H3–H6, C5–C12, BM3–BM4) with role tags, complexity, and scale 6000; verify the [REF-7 B.2] catalogue-count scenario.
- [ ] 1.2 Extend `recipes.yaml`/`templates.yaml`/`entities.yaml` for the new chains incl. the advanced combiner (3 inputs, ≥ 1 cross-region, 30 AK3, unlock 400 S2); verify the [REF-7 B.3/B.5] recipe tests.

## 2. Tiers, categories, transitions

- [ ] 2.1 Add tiers S3/S4 (capacities 35/55, AK3/AK4, income 55/120, factors 2250/3400, category scores per B.5) and category B4; verify the [REF-7 B.4] tier scenario.
- [ ] 2.2 Add the S2→S3 and S3→S4 transitions (automatic, unlock 400 S2 / 900 S3, unrefunded clamping decline); verify the [REF-7 B.7] scenarios.
- [ ] 2.3 Enforce and test cross-region confinement for B4 members (validation error on intra-region chains); verify the [GDD-3.3, REF-7 B.5] cross-region scenarios.

## 3. Transport, exchanges, unlocks, presentation

- [ ] 3.1 Add T2/T3 (slots, speeds, costs, maintenance per B.8) and extend the exchange good sets; verify the [REF-7 B.8/B.9] scenarios.
- [ ] 3.2 Add the R4 unlocks (advanced combiner, B4 producers, S4-era services) with thresholds; verify the [REF-7 B.3] unlock-gating scenario.
- [ ] 3.3 Extend the presentation package (names, descriptions, tier3/tier4 categories, sort order, unlock hints); verify the [REF-3, PIC-19] completeness scenarios and `--against` check.

## 4. Validation, tests, documentation

- [ ] 4.1 Run `pnpm aesfw validate reference/content/ref.tier --strict` (incl. design-intent promotion) and fix or promote findings; verify the [REF-5, REF-7] validation scenarios.
- [ ] 4.2 Extend the reference test suite for the R4 counts and rules; verify SCN-14 still passes unchanged (no hash change).
- [ ] 4.3 Bump the package to `0.5.0`; regenerate the client presentation data (11.4a pipeline) and rebuild the client; verify the build.
- [ ] 4.4 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections.
