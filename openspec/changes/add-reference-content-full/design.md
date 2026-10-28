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

## Migration Plan

- Additive data; saves against `0.4.0` report `content_mismatch` (pre-release acceptable). Rollback = revert.
