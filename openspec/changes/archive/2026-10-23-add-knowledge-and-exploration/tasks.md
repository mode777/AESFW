# Tasks

## 1. Core

- [x] 1.1 [GDD-16.1, ARCH-14.4] Implement phase 18 `resolveArrivals` (arrival scan, knowledge raise, `LocationDiscovered` on the unknown transition). Verify: `[ARCH-14.4]` phase 18 unit tests.
- [x] 1.2 [ARCH-14.4, GDD-15.2] Widen the order-mode gates to accept `explore` in `planTransportOrders` and `advanceTransportOrders`. Verify: `[ARCH-14.4]` explore traversal tests.

## 2. Testkit

- [x] 2.1 [INV-14] Add the INV-14 knowledge check to `checkInvariants` (monotonicity, ordering, duplicates). Verify: `[INV-14]` downgrade-detection test and no findings on nominal runs.

## 3. Scenario coverage

- [x] 3.1 [ARCH-14.4] Exercise an explore order through `runPhases` phases [9, 10, 14, 16, 18, 19] and assert both stations are discovered and no handling is requested. Verify: `[GDD-16.2]` integration test.

## 4. Documentation and verification

- [x] 4.1 Record the event-transition and unowned-unit clarifications (design); note the unowned `knowledge_state` evaluator for M10. Verify: no unintended document diff.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
