# Proposal

## Why

Roadmap 08, M8 item 8.3 (`add-location-establishment`). GDD-16.3 makes expansion a transported transaction: a location becomes usable only when an arriving unit pays the establishment cost from its cargo, founds the hub, and claims exclusive ownership — but today the `establish` order mode is still inert (8.2 opened only `explore`), no content collection defines an establishment, and nothing grants ownership of a founded location. This change adds the establishment definition, the `establish` order execution, and exclusive ownership, completing the exploration arc that SCN-05 (8.5) verifies.

## What Changes

- New `location_establishments` collection (CONT-6.20): `{ id, requires_knowledge, requires_unoccupied, cost_source: transport_cargo, costs, creates_hub, activation: on_completion, ownership: exclusive }`. Location templates gain an optional `establishment` field naming the definition that governs founding them (CONT-6.4); the plan resolves it onto the location component.
- `establish` orders are planned like route orders (phase 14); their station cursor is driven by phase 18, not by phase 16.
- Phase 18 executes the establishment transaction on arrival at the order's target station: guards (knowledge at least `requires_knowledge`, location unoccupied when `requires_unoccupied`), cost payment from the unit's cargo, hub creation through an injected establishment system, ownership claim, activation on completion, knowledge raised to `established`, station-cursor advance, and a `LocationEstablished` event — all atomic.
- Guard failures apply the transport failure policies: an occupied target uses `establishment_target_occupied`; a missing establishment definition, insufficient knowledge, or a cargo shortfall uses `origin_unavailable` (GDD-15.7's "resource unavailable" bucket).

## Capabilities

### Modified Capabilities

- `sim/exploration`: the establishment transaction and establish orders.
- `content/schemas`: the `location_establishments` collection and the template `establishment` field.

## Impact

- **Packages:** `@aesfw/content` (schema, reference checks, plan field), `@aesfw/core` (`establishmentSystem` injection, phase 18 establishment, phase 14/16 mode gates, `LocationEstablished`), `@aesfw/app` (content-built establishment system and session wiring), `@aesfw/testkit` (none — INV-14 already covers the knowledge raise), `fixtures/` (theme-free establishment coverage).
- **Tick phases:** phase 14 (plan establish orders), phase 16 (unchanged gate for establish stations), phase 18 (writes extended: `cargo`, `location`, `stationCursor`, `transportAssignment`, and the hub-instantiation stores).
- **Store kinds:** none new; `Location.establishment` is an optional component field set only when the template declares one. **Commands:** none new. **Events:** `LocationEstablished` added. **Error codes:** none. **Diagnostic codes:** `unresolved_reference`/`reference_type_mismatch` for the new reference fields (v1-literal violations are `schema_invalid`).
- **Protocol/save format:** additive optional event payloads only. **HASH-CHANGING:** no — no shipped fixture declares an establishment, so every location component keeps its exact encoding.
- **Dependencies on archived changes:** 8.2 `add-knowledge-and-exploration` (archived 2026-10-23).

## Out of Scope

- 8.4 `add-fog-filtered-projections`: filtering `LocationEstablished` and established attributes per actor.
- 8.5 `add-golden-exploration`: the SCN-05 fixture and golden.
- 8.6 `add-client-fog-and-expansion`: the client establish flow.
- 13.4 `add-multiple-owners`: shared establishments (`ownership: shared` semantics beyond the exclusive v1 literal).
- Construction-plan and condition-driven establishment (GDD-16.3's alternatives): only `cost_source: transport_cargo` is implemented.
