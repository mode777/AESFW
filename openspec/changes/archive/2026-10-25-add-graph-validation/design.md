# Design

## Context

The content pipeline (`packages/content/src/registry/load.ts`) runs manifest resolution → parsing → schema validation → composition → registry compilation → expression compilation. Composition already reports `include_cycle`, `unresolved_include`, and `invalid_merge_directive` (CONT-5); reference resolution reports CONT-11.3 findings; exchange semantics (9.1) and distribution-rule disjointness (8.1) are cross-field checks inside `references.ts`. Nothing validates the definition set as a graph. 06 §10.2 prescribes the diagnostic-fixture convention (`fixtures/content/invalid/<code>/` with `expect.yaml`) and a diagnostic catalogue cross-check, neither of which exists yet.

## Goals / Non-Goals

- Goals: every CONT-11.4 (remainder) and CONT-11.5 check as pure diagnostics over composed definitions; the M10 fixture/catalogue infrastructure; all shipped fixtures still load.
- Non-Goals: economic warnings (10.2), design-intent diagnostics (10.3), determinism checks (10.4), presentation validation (10.5), report CLI (10.6), runtime diagnostics (the simulation's `InvariantViolation` path is untouched).

## Decisions

### D1 — Stage placement and module shape

A new `packages/content/src/validation/` module exporting `validateGraphs(definitions): readonly Diagnostic[]`, called by `loadContent` after `composeDefinitions` and before `buildRegistry` (CONT-12 step 9). It operates on `RawDefinitions` like `resolveReferences` — no handles, no registry — so it stays independent of the handle space and can run on failed compositions' survivors. Sub-modules `composition.ts`, `production.ts`, `population.ts`, `spatial.ts`, `exchange.ts`, `unlock.ts` each return diagnostics; `index.ts` concatenates them in that fixed order.

### D2 — Providers, consumers, and seeds (production graph)

- **Providers** of a resource: recipe outputs, `resource_source` outputs (any mode), population-tier outputs, exchange goods with a `buy_from_exchange` entry (the exchange sells to the owner — an external market is a legitimate source), and world `initial_resources`. Owner- and global-scoped resources are **exempt from the sourcing requirement**: they are balances governed by income and deficit policy (GDD-7.5, 4.1), not produced commodities.
- **Consumers**: recipe inputs, entity `maintenance.inputs`, transport-unit `maintenance.inputs`, construction costs, transition costs, establishment costs. **Need demands are excluded by design**: an unmet need is gameplay (deficit and decline are first-class mechanics), and CONT-11.6 owns "need consumption with inadequate maximum production" as an economic diagnostic — row 10.2 implements it as a warning. Erroring here would make that warning dead text.
- **Scope**: the sourcing requirement applies to packages that declare at least one world — a runnable economy. A package without worlds is a definition library; framework tests deliberately build partial slices whose inventories are stocked at runtime by the world builder, and no shipped fixture package is affected.
- **Seeds** (recipe-cycle escape): a cycle member resource is seeded when it has a provider other than the recipes in the cycle — a resource source, population output, exchange, or world initial resource. Cycles closed purely by recipes are `recipe_cycle_unseeded`.
- Cycles are found with Tarjan SCC over the resource→recipe bipartite graph; iteration is ascending by ID everywhere (compose output is sorted), so the diagnostic set and order are deterministic. Self-loops (a recipe consuming its own output) count as cycles.

### D3 — Output storage rule

`recomputed` storage means "recomputed from providers" (capability pools); it can never be the target of a produced flow. Recipe and `resource_source` outputs of `recomputed` resources are `invalid_output_storage`. Capability resources are normally *consumed* by `capability_requirements`, which is unaffected.

### D4 — Population reachability

Roots are tiers that a residence definition can instantiate — every inhabited tier is by construction reachable, and advancement closes over them (a decline transition is not an advancement edge; transitions listed in no tier's `decline_transitions` are advancement edges). A transition whose source tier no residence can ever reach (uninhabited and unreachable from an inhabited tier) is `transition_unreachable` unless `optional: true`. The additive `optional` field on `TransitionSchema` (default absent/false) is the authored escape hatch CONT-11.5 names; the schema change is owned here per 08 §7.4.

### D5 — Spatial reachability scope

Only world `initial_entities` bind entity definitions to locations at authoring time (establishment hubs are runtime), so the check enumerates, per world: consumers per location (recipe inputs, need demands of tiers served by residences among the location's entities, maintenance inputs), producers per location (recipe outputs, `resource_source` outputs, population outputs of the location's residences, exchange goods buyable at an exchange on that location's template). World `initial_resources` seed every location of their world, and owner/global-scoped resources need no transport leg at all (owner balance, 4.1). A consumed resource not provided at its location must be carried: candidate carriers are transport units whose cargo accepts the resource (`all`, or `transportable_resources` and the resource is transportable). Tag compatibility mirrors the runtime route planner exactly: an edge passes for a carrier when the edge's `allowed_transport_tags` is empty, the carrier's `allowed_connection_tags` is empty, or they intersect (`connectionUsable` in `route.ts`); edge direction and `enabled: false` are honored. Not transportable, no structural path, or no carrier → `resource_unreachable`; a structural path exists but no carrier passes the tags → `transport_tag_mismatch`. Establishment cost resources must be transportable (checked unconditionally); the sourcing half is a whole-economy property and applies when the package declares a world (`establishment_cost_invalid`). Worlds with no `initial_entities` impose no consumption.

### D6 — Exchange and unlock graphs

Exchange: an exchange whose `location` appears in a world with ≥ 2 locations and no incident enabled connection is `exchange_unreachable`; single-location worlds and world-less exchanges pass.

Unlock: dependency edges come from raw condition trees — a condition containing query `population_count` or `residence_population` with a `tier` argument creates dependence on every unlock that exposes that tier as a `population_tier` target (the v1 condition set has no entity-availability query, so only tier edges arise). A cycle is an SCC of size > 1 or a self-dependence — an unlock counting a tier that only it exposes — and `unlock_cycle` names the lexicographically smallest member. `no_initial_content` fires when the package declares unlocks and entity definitions and every entity definition is an unlock target. Condition trees are walked structurally (`all`/`any`/`not` wrappers, comparators, arithmetic, aggregates, `sustained` recurse); unevaluated queries (`knowledge_state`, `exchange_price`) contribute no edges (recorded limitation, 10.4/M11 revisit).

### D7 — Composition compatibility

Post-composition schema re-validation: the pre-composition schema pass validated raw files; merge operations can delete required fields afterwards. Re-running the collection schemas on composed output yields `composition_schema_violation` (definition + JSON path from the TypeBox errors). The two cross-component rules schemas cannot express: `producer.recipes` present but empty → `incompatible_components`; `service_provider.capability` not capability-tagged → `incompatible_components` (mirrors the recipe `capability_requirements` rule from CONT-11.3).

### D8 — Diagnostic catalogue and invalid fixtures (06 §10.2 infrastructure)

`packages/content/src/diagnostics/catalogue.ts` exports the diagnostic-code catalogue (codes, default severity, one-line description) starting with every code this change emits plus the codes earlier stages emit (composition, schema, reference, world, exchange, distribution). `fixtures/content/invalid/<code>/` gains one minimal package per new code with `expect.yaml` (code, severity, definition, path); a cross-check test asserts catalogue ↔ fixture bijectivity for the codes this change owns (earlier stages' codes join as their fixtures land in 10.2–10.5). The CLI keeps its current behavior; text/JSON reports are 10.6.

### D9 — Severity and strictness

All codes in this change are error severity: they describe unbuildable or unreachable economies, not balance opinions. Warning-severity checks are 10.2/10.3. `strictness` mode does not change graph results (it governs unknown fields, CONT-11.2).

## Clarifications recorded (no normative amendment)

- Exchanges count as resource sources and cycle seeds (external markets, GDD-17); an exchange cannot seed its own arbitrage because 9.1 enforces sell < buy per good.
- `resource_unreachable` enumerates only authored world bindings; runtime-established locations are unchecked by design.
- Unlock-graph edges use only the evaluated condition queries; `knowledge_state`/`exchange_price` contribute nothing (v1 domain-query subset, 7.8 precedent).

## Risks / Open Questions

- The spatial check could false-positive on packages that rely on runtime establishment for supply; shipped fixtures all use `initial_entities` and must stay green — the fixture suite is the guard.
- TRANSITION: adding `optional` widens `TransitionSchema`; additive and optional, so no golden or save impact.

## Golden-hash statement

No golden changes: validation is additive and every shipped fixture must continue to load (verified by the existing suite plus the new cross-check test). (06 §9.4)
