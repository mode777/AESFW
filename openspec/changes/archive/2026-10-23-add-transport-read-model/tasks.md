# Tasks

## 1. Protocol

- [x] 1.1 [PIC-10.4] Add the transport detail DTOs and export them. Verify: type-check.
- [x] 1.2 [PIC-10.4] Add `decodeTransportDetail`. Verify: codec tests.

## 2. Read model

- [x] 2.1 [PIC-10.4] Add optional station-cursor failure storage and set it from the failure policy. Verify: existing transport tests.
- [x] 2.2 [PIC-10.4] Implement `transportDetail` and export it. Verify: read-model tests.
- [x] 2.3 [PIC-10.4] Answer `transport_detail` queries in the web host. Verify: type-check.

## 3. Documentation and verification

- [x] 3.1 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record the connection-path clarification. Verify: no unintended document change.
- [x] 3.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
