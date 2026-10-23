# Tasks

## 1. Schemas and types

- [x] 1.1 [CONT-6.4] Add optional `internal_logistics` (`policy`, `base_throughput`, `base_throughput_capability`) to `LocationTemplateSchema`; regenerate the published JSON Schema. Verify: schema unit tests.
- [x] 1.2 [CONT-6.4, TDS-8.3] Add `InternalLogisticsPlan` to `LocationPlan`, map it in `defaultWorldPlan`, and write a `throughputPool` in `instantiateWorld`. Verify: content plan and core instantiation unit tests.
- [x] 1.3 [GDD-15.1] Add `sim/internal-logistics/types.ts` (`ThroughputPool`, `ThroughputAllocation`, `ThroughputRequest`) and the scratch read/write helpers; export from `@aesfw/core`. Verify: type-check.

## 2. Core implementation

- [x] 2.1 [GDD-15.1, ARCH-5.2] Implement phase 09 `collectThroughputRequests` (sources, completing/continuous producers, `resource_consumption` needs; ascending entity ID; exclusions). Verify: `runPhases([9])` unit tests for the nominal, blocked, and non-completion cases.
- [x] 2.2 [GDD-15.1, TDS-6.3] Implement phase 10 `allocateThroughput` (capacity from base + capability supply, per-location `alloc-v1`, allocation and pool publication, `ThroughputThrottled` events). Verify: `runPhases([9,10])` unit tests for full grant, over-capacity, remainder ties, and zero capacity.
- [x] 2.3 [TDS-11.3] Add the throttle helper and apply it in phase 12 (source deposit, progress clamp), phase 13 (scaled commit/deposit, remainder release, zero-throttle deferral), and phase 20 (scaled delivery). Verify: production and need unit tests for throttled and unthrottled paths.
- [x] 2.4 [TDS-11.2] Update phase 09/10/12/13/20 `reads` and `writes` declarations. Verify: write-set tests pass.

## 3. Invariant and integration tests

- [x] 3.1 [INV-06] Add `checkThroughputAllocation` to `checkInvariants`. Verify: invariant unit tests for an over-capacity grant and an exact allocation.
- [x] 3.2 [GDD-15.1, INV-06] Integration test over `runPhases([7,9,10,11,12,13])`: an over-densified location throttles a producer, the producer moves scaled quantities, and INV-06 holds after every tick. Verify: testkit integration test.

## 4. Documentation and verification

- [x] 4.1 Update `docs/08_Implementation_Roadmap.md` scope if needed and confirm the design records the CONT-6.4 interpretation. Verify: no unintended document change.
- [x] 4.2 Run `pnpm verify` and `pnpm trace`; all green, and no new untraced requirement IDs in the claimed sections. Verify: command output.
