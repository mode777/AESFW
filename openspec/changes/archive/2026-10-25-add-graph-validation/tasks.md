# Tasks

## 1. Diagnostic catalogue and fixture infrastructure (06 §10.2)

- [x] 1.1 [CONT-11.4] Create `packages/content/src/diagnostics/catalogue.ts` with the codes of this change and the codes earlier stages emit (composition, schema, reference, world, exchange, distribution), each with default severity and description. Verify: unit test on catalogue shape.
- [x] 1.2 [CONT-11.5] Create `packages/content/src/validation/` with `composition.ts`, `production.ts`, `population.ts`, `spatial.ts`, `exchange.ts`, `unlock.ts`, `index.ts` (`validateGraphs`). Verify: type-check.

## 2. Composition compatibility (CONT-11.4)

- [x] 2.1 [CONT-11.4] Re-validate composed definitions against collection schemas → `composition_schema_violation`; add `incompatible_components` for empty `producer.recipes` and non-capability `service_provider.capability`. Verify: unit tests on in-memory sources.

## 3. Graph checks (CONT-11.5)

- [x] 3.1 [CONT-11.5] Production graph: `unsourceable_resource`, Tarjan recipe-cycle detection with seeds (`recipe_cycle_unseeded`), `invalid_output_storage`. Verify: unit tests (sourced, unsourceable, seeded cycle, unseeded cycle, recomputed output).
- [x] 3.2 [CONT-6.15][CONT-11.5] Add `optional` to `TransitionSchema`; population graph roots/DFS → `transition_unreachable`. Verify: unit tests (chain, orphan, optional orphan).
- [x] 3.3 [CONT-11.5] Spatial graph per world: `resource_unreachable`, `transport_tag_mismatch`, `establishment_cost_invalid`. Verify: unit tests (non-transportable, no path, tag mismatch, establishment cost, happy path).
- [x] 3.4 [CONT-11.5] Exchange graph `exchange_unreachable`; unlock graph `unlock_cycle`, `no_initial_content`. Verify: unit tests (isolated exchange, connected exchange, self-cycle, acyclic chain, all-gated).

## 4. Load wiring and fixtures

- [x] 4.1 [CONT-12][TDS-20.2] Wire `validateGraphs` into `loadContent` between composition and registry compilation; error diagnostics yield `content: null`. Verify: loader test with a graph error.
- [x] 4.2 [CONT-11.5] Add `fixtures/content/invalid/<code>/` packages with `expect.yaml` for every new code; cross-check test catalogue ↔ fixtures. Verify: `aesfw validate` on each fixture fails with exactly the expected diagnostics; cross-check test green.
- [x] 4.3 Confirm every shipped fixture (demo-*, scenarios) still loads with no new diagnostics. Verify: full test suite green, no golden file changed (`git status`).

## 5. Documentation and verification

- [x] 5.1 Trace tags: CONT-11.4, CONT-11.5 traced by the new tests; run `pnpm trace`. Verify: report shows CONT-11.4/11.5 traced.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`. Verify: command output green.
