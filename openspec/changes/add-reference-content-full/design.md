# Design

## Context

See proposal.md "Why". R3 (11.1) established the per-domain file layout, conversions (07 §4), automatic transitions, unlock pattern, presentation completeness, and the strict + design-intent gates; 10.1's graph validation covers production, population, spatial, exchange, and unlock graphs. R4 is a catalogue extension on the same machinery — the design risk is balance coherence and diagnostic cleanliness at twice the size, not new mechanics.

## Goals / Non-Goals

**Goals:**

- The complete Appendix B catalogue as data, strictly valid, design-intent clean.
- A world where every late-game pressure (pyramid at 4 tiers, B4 cross-region, T2/T3 logistics) is exercisable by content alone.

**Non-Goals:**

- New framework features (a gap = framework row first, per 07 §2 rule 2); world/region changes beyond B.1; M12 consumers (bench, SCN-13 on R4, migrations); re-tuning R3 (11.2 owns balance; R4 targets are non-normative).

## Decisions

### D1. Catalogue derivation rules

Resources and recipes follow B.2/B.3 mechanically: primaries split 4 α / 4 β across slots V-A–V-F and area suitability; each intermediate H refines one primary (4 P → 2 H/min); consumers combine 2–3 inputs at complexity 1–4 with the §4 tick conversions (e.g. combiner 30 ticks → 6000); BM3/BM4 extend the construction branch (refined from H2/H4-class intermediates); EP unchanged. Where B gives ranges, the choice maximizes chain diversity across regions and is recorded in `resources.yaml` comments — data-only decisions, one place.

### D2. Tier/transition symmetry

S3/S4 clone the R3 transition pattern (costs, occupancy, sustained, automatic trigger, unrefunded clamping decline) with B.7 numbers. Required category scores per B.5 land in the category definitions (S1 1; S2 2/1/1; S3 3/2/2; S4 4/3/3/2 for B1–B4).

### D3. Cross-region enforcement by construction

B4 members' recipes name at least one input whose distribution rule confines it to the other region (validated by 8.1's disjointness and 10.1's spatial/logistics graph — an intra-region B4 chain is a validation error, catching design drift at load time).

### D4. Unlocks

Every gated definition uses the population-threshold pattern (advanced combiner and coverage tiers at 400 S2; B4 members' producers and S4-era services at 900 S3), so the 7.5 unlock machinery and the build-menu lock display (11.4c) work unchanged; hints localize the thresholds.

### D5. SCN-14 and goldens untouched

`ref.tier.world.r3` and the SCN-14 scenario pin the R3 definitions they use; R4 adds definitions without altering them, so no hash changes. Growth of the definition space does not affect world instantiation of the R3 world (only referenced definitions instantiate). `bench.reference` on R4 is 11.6's concern.

### D6. Version

Package version `0.5.0`; the client's presentation regeneration (11.4a pipeline) picks up the new entries automatically.

## Risks / Trade-offs

- [Design-intent findings at catalogue scale (e.g. unused goods at R3 worlds)] → the audit is world-aware where 03 §11.7 requires; any R4-only finding is promoted consciously per 10.3 with a note, not silenced.
- [B4 pressure could be unreachable if both regions can produce a member's inputs] → D3 makes intra-region production a validation error.
- [Balance skew toward late-game inflation] → non-normative (07 §8 targets R3/R4 product goals); 11.6's runs and M12's matrix will surface gross skew.

## As built

- **Catalogue (1.1, 1.2)**: P5–P8 (α: P5/P6, β: P7/P8), H3–H6, C5–C12 with complexity 3–4, BM3/BM4, AK3/AK4. Refiners H3–H6 and BM3/BM4 follow the R3 archetypes; C5–C8 use the normal combiner (25 AK2, 2 C/min), C9–C12 the advanced combiner (30 AK3, 1 C/min, three inputs).
- **Tiers and categories (2.1, 2.2)**: S3 (capacity 35, income 55, factor 2250) and S4 (55, 120, 3400) with AK3/AK4, bands, and the S2→S3 / S3→S4 automatic transitions (14 BM2 + 8 BM3 at 400 S2; 18 BM3 + 10 BM4 at 900 S3) plus their unrefunded clamping declines. B1/B2 required scores gained the S3/S4 values, and B4 is a weighted category over C9–C12 (weights 3000/3000/4000/4000, required 2000 at S4).
- **Cross-region pressure (2.3, as built)**: every B4 member's recipe consumes at least one α-only and one β-only input (C8's third input is P7 for exactly that reason), so building any B4 member requires an inter-region import. This is enforced by content and asserted by a reference test rather than by a new validation rule; a generic "B4 member must be cross-region" validator would need category membership in the validation graph and is left to a later content-validation row.
- **Transport, exchanges, unlocks, presentation (3.1–3.3)**: T2 (4 × 100 units, speed 800, 80 BM2 + 40 BM3, 60/min) and T3 (6 × 150, speed 700, 120 BM3 + 60 BM4, 120/min); both exchanges list the R4 goods with the same elasticity; unlocks at 400 S2 (advanced combiners, S2→S3) and 900 S3 (S4 coverage service, S3→S4); the presentation catalogue and mappings cover every new definition, the tier3/tier4 categories, and the advanced-combiner and S4-service unlock hints. `--against` validation is clean.
- **Validation (4.1)**: strict validation and design-intent promotion are clean. Two economic warnings appeared while building the catalogue (`exchange_arbitrage_risk` on BM3/BM4) and were fixed by lowering those sell prices, not promoted.
- **Golden impact (4.2)**: SCN-14's golden was regenerated. The R3 behaviour is unchanged — the five 07 §8 target checks still pass at the same ticks — but definition handles are assigned over the whole catalogue, so adding resources shifts every recipe and entity handle and therefore every state hash. This is the explanation 06 §9.4 requires; the algorithm version is unchanged.
- **Version (4.3)**: `ref.tier` 0.5.0; the client presentation data is regenerated and the client builds.

## Migration Plan

- Additive data; saves against `0.4.0` report `content_mismatch` (pre-release acceptable). Rollback = revert.
