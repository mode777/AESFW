# Tasks

## 1. Schemas and types

- [x] 1.1 [CONT-9] Add `TransportOrderTemplateSchema`, the `transport_order_templates` collection, and published JSON Schema. Verify: schema tests.
- [x] 1.2 [GDD-15.2, GDD-15.7] Add order, station, action, cursor, assignment, route, failure-policy, and quantity-rule types. Verify: type-check.

## 2. Commands

- [x] 2.1 [ARCH-7.3] Add the five transport commands to the command union and app payload mapping, including template expansion and resource/endpoint validation. Verify: command tests.
- [x] 2.2 [GDD-15.2] Apply the commands in phase 01 and declare the transport stores. Verify: session integration test.

## 3. Phases

- [x] 3.1 [GDD-15.1] Add handling requests to phase 09 and declare the new reads. Verify: throughput test.
- [x] 3.2 [GDD-15.2, ARCH-14.4] Implement phase 14 station planning. Verify: route-order test.
- [x] 3.3 [GDD-15.2, GDD-15.4] Implement phase 16 staging and phase 19 committing. Verify: load/travel/unload test.
- [x] 3.4 [GDD-15.7] Implement skip/wait/retry/return/fail/retain failure policies. Verify: failure tests.

## 4. Tests and documentation

- [x] 4.1 [GDD-15.2, GDD-15.5] Test a two-station order, throughput throttling, and repeat. Verify: order tests.
- [x] 4.2 [GDD-15.2] Test create/assign/execute through the session command gateway. Verify: app session test.
- [x] 4.3 Update `docs/08_Implementation_Roadmap.md` scope/dependencies if needed and record the quantity-rule deferral. Verify: no unintended document change.
- [x] 4.4 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
