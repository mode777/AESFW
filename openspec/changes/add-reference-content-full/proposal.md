# Proposal

## Why

Roadmap 08, M11b item 11.5. M11a delivers the R3 prototype counts (Appendix B.0); the full game of 01 §23.4 needs the complete Appendix B catalogue — P1–P8, H1–H6, C1–C12, BM1–BM4, tiers S1–S4 with AK1–AK4, categories B1–B4, transports T1–T3 — so the framework's late-game mechanics (deep chains, cross-region inputs, pyramid pressure at four tiers) are exercised by content alone (GDD-23.4, acceptance "higher tiers need no engine change"). This is the content the v1.0 performance and determinism milestones (M12) will run on.

Depends on: `add-golden-complete-game` 11.3 (proposed in this batch — must be archived first, closing M11a's content track). Order within M11: first row of M11b; 11.6 follows it.

## What Changes

- `ref.tier` grows to the R4 stage of 07 §5: the full Appendix B resource catalogue (8 primary, 6 intermediate, 12 consumer with complexity 1–4, 4 construction, EP, credits, AK1–AK4), tiers S3 (capacity 35, AK3, income 55, factor 2250, B1–B3) and S4 (capacity 55, AK4, income 120, factor 3400, B1–B4), and the S2→S3 (14 BM2 + 8 BM3, unlock 400 S2) and S3→S4 (18 BM3 + 10 BM4, unlock 900 S3) transitions with automatic advancement.
- Category B4 (`weighted_score`, complexity 3–4, necessarily cross-region members) and the advanced combiner (3 inputs including ≥ 1 cross-region, unlock 400 S2) complete the breadth/depth and cross-region pressure.
- Transport classes T2 (4×100, speed 800) and T3 (6×150, speed 700); exchanges extend to the full good set; distribution rules extend to all regions and slots V-A to V-F; unlocks cover every gated definition (advanced combiner, B4 members, S3/S4 residences and services).
- The presentation package localizes every new definition with names, descriptions, categories (tier3/tier4 tabs), and unlock hints; strict validation with clean design-intent diagnostics holds at R4.
- The world stays the B.1 six-location world (R4 is a catalogue stage, not a map change; more locations would be a roadmap deviation).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/content`: the R3 package grows to the R4 catalogue of 07 §5/§7.

## Impact

- **Packages:** `@aesfw-ref/content` (data and tests). No framework package changes; no phases, store kinds, commands, events, error codes, or diagnostic codes — if a gap appears, it is a framework row with theme-free fixtures first (07 §2 rule 2).
- **Goldens:** none here. SCN-14 keeps running on the R3 world definition unchanged; SCN-13 on R4 content is 12.7, `bench.reference`/`bench.large` are 11.6/12.6.
- **Validation:** the strict + design-intent audit must stay clean with roughly double the definitions; graph validation (10.1) covers the new chains.

## Out of scope

- `add-client-performance-pass` (11.6): budgets on R4.
- `add-save-migrations`/`add-full-determinism-matrix` (12.1/12.7) and `add-performance-optimizations` (12.6): the M12 consumers of R4.
- World size or region changes beyond B.1; modules (`ref.tier.modules`, 13.5).
- Re-running SCN-14 on R4 (12.7 owns the matrix; SCN-14's R3 strategy remains the reference golden).
