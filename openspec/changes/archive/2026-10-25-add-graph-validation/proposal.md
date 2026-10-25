# Proposal

## Why

Roadmap 08, M10 item 10.1 (`add-graph-validation`), size L. The content pipeline so far validates per-document schemas (CONT-11.2), references (CONT-11.3), and scattered cross-field rules, but nothing validates the *graphs* that content forms: a package can ship a resource nobody produces, a recipe cycle with no seed, a transition nobody can reach, a consumer whose supply has no transport path, or an unlock gate that can never open. These are exactly the "specification gaps found late" defects (R-14) that M10 exists to retire, and M11a's reference prototype depends on strict validation being trustworthy. CONT-11.4 and CONT-11.5 define the checks; CONT-12 places graph validation at step 9 of the loading order.

Dependencies on archived changes: 9.1 `add-exchange-price-state` (archived 2026-10-24), 7.5 `add-unlocks` (archived 2026-10-23), 8.1 `add-regions-and-distribution-rules` (archived 2026-10-23). All archived.

## What Changes

- A new validation module `packages/content/src/validation/` that runs over *composed* definitions (RawDefinitions) after composition and reports diagnostics; `loadContent` treats its error-severity findings like any other stage (content becomes `null`).
- **Composition compatibility (CONT-11.4 remainder):** composed definitions are re-validated against their collection schemas (a merge `remove`/override can delete required fields after the pre-composition schema pass) plus cross-component compatibility rules the schemas cannot express (producer without recipes; service-provider capability not capability-tagged).
- **Production graph (CONT-11.5):** every consumed resource (recipe inputs, need demand, maintenance inputs, construction/transition/establishment costs, transport maintenance) has at least one source (recipe output, resource source, population output, exchange buy side, world initial resource); recipe cycles require a valid seed path (a member resource seeded by a source, population output, exchange, or initial resource); recipe and source outputs must use `normal` storage (`recomputed` pools are never produced).
- **Population graph (CONT-11.5):** advancement transitions are reachable from a root tier unless the transition is explicitly marked `optional` (additive `optional` field on the transition schema); tier/conversion references already resolve (CONT-11.3).
- **Spatial/logistics graph (CONT-11.5):** per world, each consumed-at-a-location resource not produced there must be transportable and reachable through the connection graph from a producing location with a transport unit whose cargo acceptance and `allowed_connection_tags` are compatible with the path; establishment costs must be transportable and sourced. (Distribution-rule coverage of templates is already enforced by 8.1.)
- **Exchange graph (CONT-11.5):** an exchange whose location is unreachable in its world's connection graph is an error (elasticity and arbitrage checks already exist from 9.1).
- **Unlock graph (CONT-11.5):** unlock dependency cycles (a condition requiring a tier/entity that only its own or a cyclic unlock chain exposes) are errors; initial content must include at least one entity definition available without any unlock.
- Additive transition-schema field `optional` (CONT-6.15 surface owned by this row).

## Capabilities

### New Capabilities

- `content/validation`: the graph and compatibility validation stage of the content pipeline (CONT-11.4–11.8 placement, CONT-12 step 9); owns the validation-stage requirements that later M10 rows (10.2–10.5) extend.

### Modified Capabilities

- `content/schemas`: additive `optional` field on the transition definition (CONT-6.15).
- `content/registry`: `loadContent` runs the graph-validation stage and fails on its error diagnostics (CONT-12 step 9).

## Impact

- **Packages:** `@aesfw/content` (new `validation/` module, `loadContent` wiring, transition schema field); fixtures (`fixtures/content/valid/…` invalid fixtures per diagnostic; valid packages unchanged). No client, host, or protocol change.
- **Tick phases:** none. **Store kinds:** none. **Commands/events/error codes:** none new.
- **Diagnostic codes (new, all error severity):** `composition_schema_violation`, `incompatible_components`, `unsourceable_resource`, `recipe_cycle_unseeded`, `invalid_output_storage`, `transition_unreachable`, `resource_unreachable`, `transport_tag_mismatch`, `establishment_cost_invalid`, `exchange_unreachable`, `unlock_cycle`, `no_initial_content`.
- **HASH-CHANGING:** no golden changes (validation only rejects content that no shipped fixture contains); all shipped fixtures must still load — verified by the existing suite.
- **Traceability:** CONT-11.4 and CONT-11.5 move from untraced to traced.

## Out of Scope

- 10.2 `add-economic-diagnostics`: warnings/configurable errors (CONT-11.6).
- 10.3 `add-design-intent-diagnostics`: design-intent warnings and strict promotion (CONT-11.7).
- 10.4 `add-determinism-validation` (CONT-11.8), 10.5 `add-presentation-package-validation` (PIC-19), 10.6 `add-validation-report-cli` (CONT-15).
- Condition-query semantics for `knowledge_state`/`exchange_price` (registered but unevaluated); unlock conditions depending on them contribute no unlock-graph edges.
