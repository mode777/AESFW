# Tasks

## 1. Content: schema and validation

- [x] 1.1 Add `MaintenanceSchema` (CONT-6.8, GDD-20.1) to the entity components schema: `interval_ticks ≥ 1`, non-empty `inputs` (`resource`, `quantity ≥ 1`), `charge_policy` enum, `shortage_policy` enum; export the JSON schema. Verify: schema unit test + regenerated `packages/content/schemas/entity_definitions.json`.
- [x] 1.2 [GDD-20.1] Validation diagnostics: `maintenance_while_processing_requires_producer` (while_processing without producer) and `unsupported_shortage_policy` (trigger_transition). Verify: content validation unit tests, both codes.

## 2. Core: owner attribution and maintenance system

- [x] 2.1 [GDD-20.2, ARCH-12] Write the `owner` component in app `instantiateContentEntities` (default location's owner) and in placement apply (placement location's owner). Verify: unit tests on both paths.
- [x] 2.2 [GDD-4.8, GDD-20.1] Implement `sim/economy/maintenance.ts` `applyMaintenance(world, registry, tx, events)`: interval-boundary check, charging-state gates per policy (D5), owner resolution, per-input account debits with reason `maintenance`, `MaintenanceCharged` events. Verify: L1 unit tests via `runPhases([26])`.
- [x] 2.3 [GDD-20.1] Shortage policies (D4): `deactivate_entity`, `scale`, `accumulate_debt` (arrears on the component), `ignore`, `owner_deficit_policy` (event stub); `MaintenanceShortage` event. Verify: unit test per policy.
- [x] 2.4 [GDD-20.1, INV-11] Deficit-paused exclusion before the policy gate. Verify: unit test injecting `deficitPaused`.
- [x] 2.5 Wire phase 26 to call `applyMaintenance` after population outputs; update reads/writes. Verify: existing phase-26 suite still green; new combined test.

## 3. App: instantiation and read model

- [x] 3.1 [CONT-6.8] Instantiate the `maintenance` component from entity definitions in `instantiateContentEntities`. Verify: app instantiation unit test.
- [x] 3.2 [PIC-10.1] Populate `EntityDetailDto.maintenance` (amount = Σ input quantities, policy = charge policy). Verify: read-model unit test.

## 4. Fixtures and integration

- [x] 4.1 Extend `fixtures/content/demo-economy`: `maintenance` on `demo.entity.producer` (`interval_ticks: 10`, credits `500`, `while_enabled`, `owner_deficit_policy`); extend the scenario assertions to income minus expenses. Verify: `aesfw validate fixtures/content/demo-economy --strict`; `aesfw run` scenario clean with invariants.
- [x] 4.2 [GDD-4.8, GDD-20.1, VER-8.1] Integration test: full pipeline over the economy fixture credits income and debits maintenance; determinism harnesses (double-run, clone-run, save-continue) stay green across an interval boundary with arrears. Verify: testkit integration test.

## 5. Documentation and traceability

- [x] 5.1 Run `pnpm trace`; confirm GDD-4.8, GDD-20.1, INV-11 traces land and no new untraced IDs in claimed sections. Verify: `pnpm trace` output.
- [x] 5.2 Record the accumulate-debt v1 interpretation and the temporary `trigger_transition` diagnostic in design.md (done at proposal time; confirm during apply). Verify: design.md sections present.

## 6. Verification

- [x] 6.1 Run `pnpm verify` and `pnpm trace`; all green, no new untraced requirement IDs in the claimed sections.
