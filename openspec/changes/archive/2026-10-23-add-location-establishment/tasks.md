# Tasks

## 1. Schemas

- [x] 1.1 [CONT-6.20, CONT-6.4] Add the `EstablishmentSchema`, register `location_establishments` at the end of the catalogue, add the template `establishment` field, and regenerate the published JSON Schema. Verify: `[CONT-6.20]` schema tests for valid/invalid literals.

## 2. Core

- [x] 2.1 [GDD-16.3] Add the `establishment` definition type, the `EstablishmentSystem` interface, the `TickInput`/`TickContext` injection, and the optional `Location`/`LocationPlan` field. Verify: type-check and the location encode test.
- [x] 2.2 [GDD-16.3, CONT-6.4] Resolve the template `establishment` in `templatePlan` and carry it through instantiation. Verify: `[CONT-6.20]` plan and component tests.

## 3. Transaction

- [x] 3.1 [GDD-16.3, ARCH-14.4] Implement the phase 18 establishment transaction (guards, failure mapping, atomic success path, cursor advance, `LocationEstablished`). Verify: `[GDD-16.3]` success, guard-failure, occupied, and no-definition tests.

## 4. Orders

- [x] 4.1 [GDD-15.5, ARCH-14.4] Widen the phase 14 planning gate to `establish` and keep the phase 16 station gate at `route | explore`. Verify: `[GDD-15.5]` traversal and release tests.

## 5. App wiring

- [x] 5.1 [GDD-16.3] Build the content establishment system in `@aesfw/app` and inject it in `session.advance`. Verify: the session-level establish integration test.

## 6. Fixtures

- [x] 6.1 Extend the theme-free exploration fixture coverage with an establishment definition and a template using it. Verify: the fixture loads with no diagnostics.

## 7. Documentation and verification

- [x] 7.1 Record the failure-key mapping and guard defaults (design); confirm `docs/08` needs no change beyond archiving. Verify: no unintended document diff.
- [x] 7.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
