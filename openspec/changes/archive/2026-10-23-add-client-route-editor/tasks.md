# Tasks

## 1. Read model and protocol

- [x] 1.1 [PIC-10.4] Add `TransportOrderDto` and `transportOrders`. Verify: read-model test.
- [x] 1.2 [PIC-10.4] Answer the `transport_orders` query in the web host. Verify: type-check.

## 2. Client selector

- [x] 2.1 [REF-12.4] Add unit/order rows, the logistics view model, draft conversion, and validation. Verify: selector tests.
- [x] 2.2 [REF-12.4] Test the draft round-trip and validation. Verify: selector tests.

## 3. Client view and wiring

- [x] 3.1 [REF-12.4] Add the logistics drawer and route editor with all quantity rules and price limits. Verify: type-check.
- [x] 3.2 [REF-12.4, REF-13.4] Add the `L` drawer key and wire create/modify/delete/assign/unassign commands. Verify: type-check and manual/browser smoke.

## 4. Documentation and verification

- [x] 4.1 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record the draft clarification. Verify: no unintended document change.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
