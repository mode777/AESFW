# Tasks

## 1. Schemas and types

- [x] 1.1 [CONT-6.12] Add the `ServiceSchema` and the `services` collection (`service` definition type) to the catalogue; regenerate the published JSON Schema. Verify: schema unit tests for the compile and radius-rejection scenarios.
- [x] 1.2 [CONT-6.8] Add `service_provider` to the entity components schema (mode/service/relation/capability/quantity_per_tick/consumes). Verify: schema unit tests for provider shapes.
- [x] 1.3 [CONT-6.11] Extend the need demand union with `service_capacity`, `spatial_coverage`, and `state_query`; add service and condition reference checks in the registry reference resolution. Verify: `[CONT-6.11]` reference-validation test for the unknown-service scenario.

## 2. Core state and demand

- [x] 2.1 [GDD-12.2] Add the `ServiceProvider` component kind (encoded/hashed) and extend `NeedSpec`/`NeedType` with the new supplier fields. Verify: codec round-trip test for a world with providers.
- [x] 2.2 [GDD-12.2] Phase 08: demand for `service_capacity` (population-scaled), unit demand for `spatial_coverage`/`state_query`. Verify: `[GDD-12.2]` demand unit tests.

## 3. Delivery

- [x] 3.1 [GDD-12.2, ARCH-5.2] Phase 20: capacity allocation per location in ascending residence order (D3). Verify: `[GDD-12.2]` allocation tests for the ascending-order and zero-provider scenarios.
- [x] 3.2 [GDD-3.6, GDD-12.2] Phase 20: coverage counting with the spatial `covers` policy, effective relations, and disabled/inactive exclusion (D4). Verify: `[GDD-3.6]` coverage tests for the inside, outside, and distinct-provider scenarios.
- [x] 3.3 [TDS-14.2] Phase 20: `state_query` delivery through the injected condition evaluator (D5). Verify: `[TDS-14.2]` state-query tests for true and false conditions.

## 4. Instantiation

- [x] 4.1 [CONT-6.8, CONT-6.12] Resolve `service_provider` components in `@aesfw/app` instantiation (service handle, effective relation, capability, quantity). Verify: instantiation unit test for the default-relation scenario.

## 5. Documentation and verification

- [x] 5.1 Record the capacity-provider and relation-override clarifications (design); confirm `docs/08` needs no row change beyond archiving. Verify: no unintended document diff.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
