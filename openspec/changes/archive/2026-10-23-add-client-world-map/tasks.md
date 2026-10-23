# Tasks

## 1. Data

- [x] 1.1 [PIC-9.1] Add `ConnectionDto`, `TransportSummaryDto`, and the snapshot fields; decode them. Verify: codec tests.
- [x] 1.2 [PIC-9.1] Populate connection details and transport summaries in the projection. Verify: projection tests.
- [x] 1.3 [REF-7] Add R2 connection, transport unit, order template, world, and transport entity definition. Verify: reference content tests.

## 2. Client

- [x] 2.1 [REF-12.1] Add the pure world-map selector. Verify: selector tests.
- [x] 2.2 [REF-12.1] Add the SVG world-map view with connection labels, ownership, fog, and transport dots. Verify: type-check and selector tests.
- [x] 2.3 [REF-12.1, REF-13.2] Add the Map/Grid toggle and `M` key. Verify: manual/browser smoke.

## 3. Documentation and verification

- [x] 3.1 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record the layout clarification. Verify: no unintended document change.
- [x] 3.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
