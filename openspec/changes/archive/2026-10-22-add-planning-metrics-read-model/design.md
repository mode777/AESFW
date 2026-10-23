# Design

## Context

TDS-18.5 fixes the formulas and names the module: `@aesfw/app/readmodels/planning.ts`. All inputs are resolved runtime components (producer recipe specs, residence need specs, consumption factors, maintenance), so the read model needs no content access beyond string-ID resolution. PIC-10.5 asks for owner and location scopes. The deficit policy's 4.3 helpers established the per-tick rate convention.

## Goals / Non-Goals

- Goals: exact-rational internal arithmetic with integer display; hand-verifiable numbers (SCN-18 framework); additive protocol only.
- Non-Goals: utilization/throttle-adjusted fields (M5), client rendering and host exposure (4.7), reference-chain SCN-18 (M11), multi-hop chains (M11).

## Decisions

### D1 — Rationals as reduced integer pairs

A 30-line rational helper (`num/den`, `den > 0`, gcd-reduced, safe integers) supports add, multiply, divide, and floor. Recipe rates are `quantity / duration` (batch) or `quantity` (continuous); per-capita is `Σ quantity × consumptionFactor / 1000`; supported is `floor(net / perCapita)` clamped to `≥ 0` (a negative net rate supports nobody — the literal floor of a negative rational is meaningless for population). Fixture-scale quantities keep products far below `2^53`.

### D2 — Scopes

Owner scope: producers and residences whose `owner` component equals the actor (the 4.2 convention). Location scope: producers with `producer.location === L` and residences with `residence.location === L`, for every location with at least one such entity. Resources enter the read model only when a `resource_consumption` need consumes them (PIC-10.5); chains additionally cover produced resources.

### D3 — Chain stages

A chain per produced resource `R`: producers whose selected recipe outputs **or consumes** `R`, grouped by entity definition. This one-hop closure covers the reference two-stage chains (extractor → refiner); deeper transitive closure is deferred to M11 with real content. Stage `ratio` is `count / gcd(all stage counts)`. Stage maintenance is the total per-interval due (Σ input quantities) of the stage's entities; `output_per_tick` counts only the chain resource's outputs (consumers report `0`).

### D4 — Coverage ratio

`floor(population × 1000 / supported)` permille, `0` when supported is `0`. Values above `1000` mean the current population exceeds what the chain supports — the deficit signal the planning view highlights.

### D5 — Codec

`decodePlanning` joins the existing read-model codec family with the same `protocol.invalid_field` error convention. The host exposure the client needs is owned by 4.7 (its `Depends on` names this row).

## Risks / Trade-offs

- [Nominal rates ignore blocking and throttling] → TDS-18.5 explicitly separates nominal from adjusted fields; adjusted fields arrive with M5 throttling.
- [One-hop chains misclassify multi-level chains] → recorded limitation; the stage grouping is by definition, so reference content in M11 can refine the closure without a DTO change.

## Migration Plan

Additive protocol types and codec; read models are not hashed — no golden impact.

## Open Questions

None.
