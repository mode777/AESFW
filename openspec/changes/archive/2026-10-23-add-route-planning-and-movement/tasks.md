# Tasks

## 1. Types and planner

- [x] 1.1 [ARCH-14.1] Add `traversalTicks` using `mulDiv(..., 'ceil')`. Verify: unit tests.
- [x] 1.2 [ARCH-14.3] Add `planRoute` with total-tick cost and lexicographic connection-id tie-breaking. Verify: route tests.
- [x] 1.3 [ARCH-14.1] Extend `TransportMovement` with current location, path, connection ids, step, and progress; initialize the location at transport instantiation. Verify: type-check and instantiation test.

## 2. Movement phase

- [x] 2.1 [ARCH-14.1, ARCH-14.2] Add `startMovement` and `advanceMovement`. Verify: unit tests.
- [x] 2.2 [TDS-11.1] Implement phase 16 `advanceTransport`, emit `TransportArrived`, and record arrivals in scratch. Verify: phase 16 tests.
- [x] 2.3 [ARCH-14.2] Cover abstract and physical parity. Verify: route test.

## 3. Documentation and verification

- [x] 3.1 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record clarifications. Verify: no unintended document change.
- [x] 3.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
