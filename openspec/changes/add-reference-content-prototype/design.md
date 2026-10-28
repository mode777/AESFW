# Design

## Context

See proposal.md "Why". `main` carries WIP `b360273`: `ref.tier` is already split into the per-domain files of 07 §6 (package `0.3.0`, files enumerated in `package.yaml`), the world file defines six locations with one established, and `ref.tier.presentation` has a staged `localization.en.yaml.new` (231 lines) alongside the R1-era `localization.en.yaml`. The reference test and the client bundler still read the removed `content.yaml`. Every mechanic R3 needs exists after M10: seeded regions and disjoint distribution (8.1), fog-filtered projections (8.4), establishment (8.3), exchanges (9.1/9.2), unlocks (7.5), automatic transitions (7.3), coverage needs (7.6), throughput (5.1/5.2).

## Goals / Non-Goals

**Goals:**

- Finish the R3 package so `aesfw validate --strict` (including design-intent promotion) and the presentation check pass.
- A start state that satisfies 07 §8's "start state" target without balance tuning (11.2 owns tuning).
- Repair the split-layout breakage in `reference/content/test` and the client's raw imports.

**Non-Goals:**

- Framework changes of any kind; R4 content (11.5); balance strategies and target checks (11.2); SCN-14/SCN-18 goldens (11.3); the presentation-package loading architecture in the client (11.4a owns it — this change only keeps the build green).

## Decisions

### D1. Keep the per-domain layout; finish it

The WIP file split matches 07 §6 exactly and stays. `localization.en.yaml.new` replaces `localization.en.yaml` (it is the completed R3 catalogue; the `.new` suffix was only staging). The package version becomes `0.4.0`. The reference test switches from reading `content.yaml` to reading the file list from `package.yaml` in manifest order, so later file additions do not break it again.

### D2. World, regions, and generation

- Locations: `ref.tier.loc.alpha_1..alpha_4` and `beta_1..beta_2`, all `framework.spatial.grid` 40×40 with per-location buildable ratio drawn from the seeded `world_generation` stream (400–700 permille). Authored supply (8.1): `alpha_1` keeps the R1-era `suitability_p1: 1000` and `v_a` slots so generation cannot move them.
- Distribution rules: region α owns `suitability_p1/p2` and slots `v_a`/`v_b`; region β owns `suitability_p3/p4` and slot `v_c`. Disjointness is expressed by the rules (each names only its region's properties and slot type), which 8.1 validation enforces. **As built:** α templates carry `suitability_p1` and `v_a`, β templates carry `suitability_p3` and `v_b`; the rule declares `disjoint.properties: [ref.tier.property.suitability_*]` and `disjoint.source_slot_types: true`, which is the property family and slot-type pair the two regions actually use at this stage.
- Start state: world `ref.tier.world.prototype` with owner `owner.0` establishing `alpha_1`, knowing `alpha_2` and `alpha_3` (the α exchange), and initial entities at `alpha_1`: hub, 2 S1 residences, 2 area extractors (P1), 2 refiners (H1), 1 slot extractor (P2), 1 T1 transport unit. The combiner is **not** initial (it unlocks at 150 S1); the start chain is the S1 economy plus initial C stock.

**Tuned numbers (recorded per D2's rationale).** The initial stock is BM1 40 units (240000), P1 20 (120000), P2 20 (120000), H1 10 (60000), C1 10 (60000), and C2 10 (60000). C2 was added to the design's list because B1 has C2 as an active member for S1: consuming a resource the location can never obtain is a design-intent finding (`resource_unreachable`), and C2 is a cross-region good at this stage. A 600-tick headless run with no commands keeps every residence's satisfaction at 1000 permille, which satisfies the "start state" target without trade. The exact numbers stay a balance decision for 11.2.

### D3. Tiers, needs, bands, transitions

- `population.s1`: capacity 10, AK1 ×1, income 10/pop/tick, factor 1000, categories [B1]. `population.s2`: capacity 20, AK2 ×1, income 25, factor 1500, categories [B1, B2, B3].
- B1/B2 are `weighted_score` with weight = complexity; C1 (1) and C2 (2) in B1; C3 (2) and C4 (3) in B2; required score S1 1 / S2 2 in B1 and S2 1 in B2. B3 is `spatial_coverage` over the coverage service (`ref.tier.entity.coverage_service`, footprint 4×4, radius 18, cost 15 AK2, maintenance 45/min), required 1 at S2.
- Bands: thresholds 800/500/250 permille; growth `interval_ticks: 8`; grace 60; emigration `interval_ticks: 4`; multipliers 1000/700/400; `empty_policy: decay`.
- Transitions: `new_s1_residence` (6 BM1), `s1_to_s2` (10 BM1 + 6 BM2, unlock `population_count ≥ 150` of S1, occupancy + sustained Z ≥ 800 for 60 ticks, trigger `automatic_when_eligible`), decline `s2_to_s1` (`refund_policy: none`, `clamp_to_target_capacity`). The player gates advancement with purpose locks on BM1/BM2 (07 §7 B.7, redesign D9).
- BM2 is refined from H1 (the advanced branch of the B.3 table adapted to the R3 catalogue); EP is combined from H1 + H2 + a cross-region primary at the "expensive" rate (design freedom of B.2, kept data-only). **As built:** EP is combined from 2 BM1 + 2 C1 at a 120-tick batch, i.e. one eighth of the combiner rate. H1 + H2 + P4 would have made EP compete with C3/C4 for the same intermediates; BM1 + C1 spends the construction and consumer branches instead, which is the "expensive" reading of B.2. Both variants are data-only, so 11.2 may swap them without a framework change.
- **Deviation: no extractor or service capability cost.** B.3 gives slot/area extractors 10 AK1 and the coverage service 15 AK2, but the framework has no `capability_consumer` component (03 §6.8 documents it; no package implements it) and `resource_source`/`service_provider` take no capability requirements. Only recipes declare `capability_requirements`, so refiners and combiners pay AK1/AK2 as specified and extractors and the coverage service consume none. Adding a capability-consumer component is a framework feature outside this row (it belongs with a producer/extractor row); the gap is recorded in the risk list rather than papered over.
- **As built:** a "new S1 residence" is the `ref.tier.template.residence` construction cost (6 BM1) rather than a `transitions` entry: construction already owns placement and cost commitment (3.3), and a transition to the same tier would duplicate it. `ref.tier.entity.residence_s2` has no `placement`, because it only arises from advancement.

### D4. Economy, exchanges, establishment

- Maintenance `while_enabled` per B.3 converted with 07 §4 (e.g. refiner 15/min → `interval_ticks: 60`, quantity `90000`); connectors stay free; the deficit policy is the framework `owner_deficit_policy` with pause-highest-first and automatic resume.
- Exchanges: `ref.tier.exchange.alpha` / `.beta`, one per region, trading the region's primary surplus and C-goods, with the §4 elasticity numbers verbatim. **As built:** no consumer good is traded. Every exchange lists the P, H, and BM goods (both directions, with the cross-region halves disabled where the region does not source them); C goods and EP are not listed, because C goods come from the region's own chains and EP is the establishment currency. This keeps the elasticity check meaningful (every traded good has a counterparty) and matches the "trading the region's primary surplus" half of this decision.
- Establishment: `establishment.yaml` costs 1 EP per location (GDD-16.3); hubs come from establishment (B.3 hub unlock "1 EP via transport" is expressed as the establishment cost plus a hub-throughput definition at the established location).

### D5. Presentation package completion

`mappings.yaml` maps every placeable definition to `display.category_key` (`ref.tier.category.s1` / `ref.tier.category.s2` — the keys the localization catalogue already defines; the earlier draft named `tier1`/`tier2`) and a `sort_order`, and `fallback_shape` follows the REF-10.2 archetype names (`hub`, `connector`, `slot_extractor`, `area_extractor`, `refiner`, `combiner`, `residence`, `storage_module`, `coverage_service`). `localization.en.yaml` carries name + `.description` for every definition, `.unlock_hint` for the two unlock-gated groups (combiners and coverage service; the S1→S2 transition), and the category keys. `formatting.yaml` declares base scale 6000, decimals 0, and a rate unit of `/min` with `tick_duration_ms: 1000`. PIC-19 validation (`--against ref.tier`) must pass.

### D6. Client bundling stays minimal

`src/content/r0.ts` is regenerated to enumerate the split files (raw imports in `package.yaml` order) so the client keeps building; the presentation-loading architecture (build-time conversion) is 11.4a's decision, not made here.

### D7. No document changes

07 §5/§7 already describe the R3 stage and automatic advancement (redesign change, archived). No amendment to 01–07 is needed; the start-stock numbers are content data recorded in this design (D2), and 08's M11a table already matches this scope.

### D8. Framework changes this change carries

The proposal's "no framework package changes" non-goal did not survive the WIP: the R3 start state needs three framework capabilities that M10 did not have. They are content-neutral (no reference IDs, no reference terminology) and covered by existing package tests:

1. **Initial location stock.** `worlds[].locations[].initial_inventory` is parsed into `LocationPlan.initialInventory` (CONT-6.6) and seeded into the location's first inventory at instantiation, in ascending resource handle with duplicate lines summed and capacity clamped. `CONT-6.6` and the world schema are amended accordingly.
2. **Per-tier required category scores.** `need_categories[].evaluation.required_score_by_tier` overrides `required_score` for one tier (GDD-12.3, CONT-6.13). Both the definitions compiler and the transition runtime resolve it by tier ID.
3. **Static-supply awareness in the design-intent and economic checks.** A resource listed in a location's `initial_inventory` counts as local supply for `resource_unreachable` and `throughput_below_equilibrium`. Without it, a start state that ships consumer goods would be reported as permanently unreachable, contradicting 07 §8's "start state ... without any trade command".

Two defects were also fixed because this change exercises their code paths:

- `aesfw validate <presentation> --against <simulation>` built its simulation-ID sets from collection keys (`entity_definitions`) instead of definition types (`entity`), so every mapping target looked absent. It now maps through `DEFINITION_COLLECTIONS`.
- `satisfaction_bands[].bands[].min` ordering and the band table were already validated; the R3 content minimal pairs (`800/500/250`) are covered by the new reference tests.

## Risks / Trade-offs

- [Start stock mistuned → first-minute deadlock or trivial win] → 07 §8 targets are checked by 11.2's balance runs; this change ships a conservative stock and records the numbers here.
- [Design-intent diagnostics may flag prototype simplifications (e.g. untraded goods, unused slots)] → the audit is part of this change's exit; any finding is either fixed in content or promoted consciously per 10.3, never silenced.
- [R3 catalogue size doubles validation surface] → `pnpm aesfw validate` stays load-time-only (M10); no per-tick cost is added.
- [B.3 capability costs are only partly expressible] → extractors and the coverage service consume no AK in R3 because the framework has no `capability_consumer` component, so the pyramid pressure comes from refiners and combiners only. A future extractor row can add the component without content churn.
- [Design-intent checks now trust authored start stock] → a location could look "supplied" on the strength of finite stock. The check is a load-time intent audit, not a steady-state proof; 11.2's balance run is what proves the economy closes.

## Migration Plan

- Replace the staged localization file; delete nothing else (the split is already on `main`). Rollback = revert the commit.
- The package checksum changes; saves made against `0.3.0` report `content_mismatch` by design (ARCH-15.2) — acceptable pre-release.

## Open Questions

- The exact EP recipe (which cross-region primary participates) — decided by balance preference in 11.2; both alternatives are data-only changes.
- Whether extractors should consume AK1 through a future `capability_consumer` component — a framework feature, not a content decision.
