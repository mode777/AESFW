# Proposal

## Why

Roadmap 08, M11a item 11.1. The reference content is at stage R2/R3-partial: it demonstrates every framework feature but not the complete prototype game of 01 §23.4/§23.5. This row delivers the R3 prototype content (Appendix B.0 counts) that SCN-14, the balance runner, and the M11a human playtest all run on, and it retires the content half of **R-08** (a complete, legible game exists to playtest). A WIP commit on `main` (`b360273`) already split `content.yaml` into the per-domain files of 07 §6 and staged `localization.en.yaml.new`; this change owns finishing that work.

Depends on (all archived): `add-design-intent-diagnostics` 10.3 (2026-10-25), `add-client-throughput-indicators` 5.4 (2026-10-23), `add-client-population-and-transitions` 7.9 (2026-10-23), `add-client-fog-and-expansion` 8.6 (2026-10-24), `add-client-exchange-view` 9.5 (2026-10-25). Order within M11: first content row; 11.4a may run in parallel; 11.2 and the 11.4c/11.4f content-dependent rows follow this change.

## What Changes

- The `ref.tier` package becomes the R3 prototype stage of 07 §5/§7, per Appendix B.0–B.9:
  - a 6-location world (4 in region α, 2 in β) on seeded `framework.spatial.grid` locations with disjoint α/β distribution rules, fog enabled, and a start state of one established α location with one adjacent location and the α exchange known;
  - the B.0 resource catalogue (4 primary, 2 intermediate, 4 consumer, 2 construction, EP, credits, AK1–AK2) with role tags and the 6000 base scale;
  - tiers S1 and S2 with exact-match AK outputs, per-capita income (10/25 per tick), consumption factors (1000/1500 permille), and categories B1–B3 (B3 = spatial coverage);
  - the B.6 satisfaction bands (growth +1/8 ticks, decline grace 60 ticks, emigration −1/4 ticks, income ×1.0/0.7/0.4, empty decay) and the B.7 transitions (new S1 residence, automatic S1→S2 advancement with unlock 150 S1, unrefunded clamping decline);
  - transport T1, `while_enabled` maintenance, the B.9 deficit policy (pause highest maintenance first, automatic resume), one exchange per region with the 07 §4 elasticity, and EP-based establishment;
  - unlocks (combiner and coverage service at 150 S1 population) and purpose locks gating advancement costs.
- `ref.tier.presentation` becomes the complete presentation package: localized names and descriptions for every definition, tier display categories and sort order, formatting (scale 6000, tick 1000 ms), and static unlock hints.
- The reference test suite is repaired for the split package layout (it still reads `content.yaml`) and extended for the R3 stage.
- The package version advances to `0.4.0`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/content`: the R2 seed grows to the R3 prototype stage of 07 §5 — world, regions, resource catalogue, tiers, categories, bands, transitions, economy, exchanges, establishment, unlocks, and the complete presentation package.

## Impact

- **Packages:** `@aesfw-ref/content` only (`ref.tier` and `ref.tier.presentation` data, `reference/content/test`). No framework package changes: every mechanic used already exists (M3–M10) and content is data only (07 §2 rule 2).
- **Phases, store kinds, commands, events, error codes, diagnostic codes:** none added or changed in the framework.
- **Broken WIP state repaired:** `reference/content/test/ref-tier.test.ts` reads the removed `content.yaml`, and `reference/client-web/src/content/r0.ts` imports it (`?raw`) — both are updated for the split layout (the client fix is shared with 11.4a, which owns the bundling design; this change keeps the client building by enumerating the split files).
- **Validation:** `aesfw validate reference/content/ref.tier --strict` and the presentation check `--against ref.tier` stay clean, including design-intent diagnostics with promotion (M11a exit criterion; 06 §10.3).
- **Goldens:** no framework golden changes; reference scenarios and their goldens are owned by 11.3.

## Out of scope

- `add-balance-runner-strategies` (11.2): scripted strategies, metrics CSV, and the 07 §8 balancing-target checks.
- `add-golden-complete-game` (11.3): SCN-14 and the reference half of SCN-18.
- `add-client-game-shell` (11.4a) and later client rows: presentation-package loading design, HUD, world canvas, panels, windows, news, polish.
- `add-reference-content-full` (11.5): R4 content (P5–P8, H3–H6, C5–C12, BM3–BM4, S3–S4, B4, T2–T3).
- Balance tuning beyond a first playable pass: numbers are tuned to hit 07 §8's targets in 11.2/11.3.
