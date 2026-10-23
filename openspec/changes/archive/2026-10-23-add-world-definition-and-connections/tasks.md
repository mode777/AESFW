# Tasks

## 1. Schemas and types

- [x] 1.1 [CONT-6.5] Add `ConnectionDefinitionSchema` and `connection` to the definition collections and `DefinitionType`; regenerate the published JSON Schema. Verify: schema unit tests.
- [x] 1.2 [CONT-6.6] Add `WorldDefinitionSchema` and `worlds` to the definition collections; allow `region` and `properties` on world locations. Verify: schema unit tests.
- [x] 1.3 [CONT-6.6, CONT-11.3] Extend reference validation for world templates, connection definitions, endpoints, owner locations, and duplicate ids. Verify: diagnostic fixtures.
- [x] 1.4 [GDD-6.3] Add `LocationConnection`, extend `Location` with optional `connections`, and extend `LocationPlan`/`WorldPlan` with owner, owners, and connection plans. Verify: type-check.

## 2. World plan and instantiation

- [x] 2.1 [CONT-6.6] Implement `worldPlan(registry, worldId)` and share location-template mapping with `defaultWorldPlan`; report `unknown_world`. Verify: plan unit tests.
- [x] 2.2 [CONT-6.6, GDD-6.1, GDD-16.1] Instantiate multiple owners, accounts, knowledge, per-location owners, and connection instances in `instantiateWorld`. Verify: instantiation unit tests.
- [x] 2.3 [CONT-6.6] Select the world in the scenario runner and web host. Verify: existing scenario tests still pass; a world-definition scenario uses the declared locations.

## 3. Activation commands

- [x] 3.1 [GDD-6.2, ARCH-7.3] Add `ActivateLocation` and `DeactivateLocation` to the command union, the app command mapping, and phase 01 with owner and location validation. Verify: phase 01 unit tests.
- [x] 3.2 [GDD-6.2] Confirm inactive locations suspend throughput requests and production. Verify: existing inactive-location path plus a focused test.

## 4. Projection and integration tests

- [x] 4.1 [PIC-9.1] Emit outgoing connection ids in location snapshots. Verify: projection unit test.
- [x] 4.2 [GDD-6.2, GDD-6.3] Integration test: a two-location world with two owners, one connection, and activation/deactivation through a session. Verify: invariants hold after every tick.

## 5. Documentation and verification

- [x] 5.1 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record any clarification. Verify: no unintended document change.
- [x] 5.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
