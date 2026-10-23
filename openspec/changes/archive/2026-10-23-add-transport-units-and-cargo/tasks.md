# Tasks

## 1. Schemas and types

- [x] 1.1 [CONT-6.16] Add `TransportUnitSchema`, the `transport_units` collection, and published JSON Schema. Verify: schema unit tests.
- [x] 1.2 [CONT-6.16, CONT-11.3] Validate transport-unit entity and maintenance references. Verify: reference validation tests.
- [x] 1.3 [GDD-15.4] Add `Cargo`, `TransportMovement`, `TransportHandling`, and pure cargo operations. Verify: cargo unit tests.

## 2. Instantiation

- [x] 2.1 [CONT-6.6] Add `InitialEntityPlan` and fill it from a world definition's owners. Verify: world-plan unit test.
- [x] 2.2 [CONT-6.6, CONT-6.16] Add `instantiateWorldContent`, instantiate initial entities at their location and owner, and attach transport components. Verify: app instantiation tests.
- [x] 2.3 [CONT-6.6] Use `instantiateWorldContent` in the scenario runner and web host. Verify: existing scenario and host tests still pass.

## 3. Invariant and tests

- [x] 3.1 [INV-16] Add the cargo-slot check to `checkInvariants`. Verify: invariant unit test.
- [x] 3.2 [GDD-15.4] Test unrestricted, typed-slot, and per-resource cargo, acceptance, deterministic fill, and unloading. Verify: cargo tests.
- [x] 3.3 [CONT-6.16, GDD-15.4] Test a world initial transport unit and its maintenance. Verify: app instantiation tests.

## 4. Documentation and verification

- [x] 4.1 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record the per-resource clarification. Verify: no unintended document change.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
