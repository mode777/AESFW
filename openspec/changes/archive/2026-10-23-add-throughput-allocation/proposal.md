# Proposal

## Why

Roadmap 08, M5 item 5.1 (`add-throughput-allocation`). The closed economy runs, but a location can move an unbounded quantity between entities and its shared inventory, so over-densification has no cost and GDD-3.9's internal-logistics mechanic is absent. This change implements the throughput pool, phase 09 request collection, phase 10 `alloc-v1` allocation, and the throttling rule that phases 11–20 obey, retiring the R-08 legibility gap that over-densification is invisible and reducing R-04 (phase-interaction mistakes) with INV-06.

## What Changes

- Location templates gain `internal_logistics` (CONT-6.4): a `policy` and a numeric `base_throughput` per tick, with an optional `base_throughput_capability` whose location-scoped supply is added to the base. A location without `internal_logistics` keeps the existing unbounded shared-access behaviour.
- New `throughputPool` and `throughputAllocation` components (TDS-8.3): one pool per throughput-limited location and one allocation per requesting entity, both recomputed every tick in phase 10.
- Phase 09 `collectThroughputRequests` collects every movement planned for the tick — source output, producer input and output movement, and `resource_consumption` need deliveries — in ascending entity ID.
- Phase 10 `allocateThroughput` allocates each location's capacity across its requesters with `alloc-v1` (TDS-6.3), publishes per-requester `throttle_permille`, and emits `ThroughputThrottled` when a requester is throttled.
- Phases 11–20 honour the granted throttle (TDS-11.3 rule 3): a throttled requester moves `floor(planned × throttle_permille / 1000)`; a fully throttled producer stays processing and reports `throughput_throttled`.
- `checkInvariants` gains INV-06 (grants per location never exceed capacity, each grant never exceeds its request, and grants differ from exact proportional shares by less than one unit).
- Theme-free fixture coverage for the nominal, throttled, zero-capacity, and unlimited paths.

## Capabilities

### New Capabilities

- `sim/internal-logistics`: throughput pools, request collection (phase 09), `alloc-v1` allocation (phase 10), and throttling semantics for phases 11–20.

### Modified Capabilities

- `content/schemas`: the location template gains `internal_logistics`.
- `sim/production`: source output and producer movement obey the granted throughput; a throttled producer reports `throughput_throttled`.
- `sim/needs`: resource-consumption need delivery obeys the granted throughput.
- `testkit/harness`: INV-06 is added to `checkInvariants`.

## Impact

- **Packages:** `@aesfw/core` (`sim/internal-logistics`, phases 09–13 and 20, `LocationPlan`, `instantiateWorld`), `@aesfw/content` (location schema and world plan), `@aesfw/testkit` (INV-06), `fixtures/` (theme-free coverage).
- **Tick phases:** phase 09 `collectThroughputRequests` (reads producer, resourceSource, residence, needStates, location, enabled, lifecycle, owners; writes nothing), phase 10 `allocateThroughput` (reads the same plus `throughputPool` and capability supply; writes `throughputPool`, `throughputAllocation`), phase 12 `advanceProcesses` and phase 13 `commitProduction` (write producer/source/inventory/ledger), phase 20 `allocateServicesAndConsumeNeeds` (writes needStates/inventory/ledger).
- **Store kinds:** `throughputPool`, `throughputAllocation` (both already in the v1 catalogue; values become populated).
- **Commands/events:** none new; event `ThroughputThrottled`. **Error codes:** none. **Diagnostic codes:** none.
- **Protocol/save format:** no protocol change; the two store kinds are already encoded and hashed. **HASH-CHANGING** only for content that opts into `internal_logistics`: the existing `demo-basic-loop` and `demo-loss-spiral` fixtures have no `internal_logistics`, so their goldens are unchanged. Any new golden is introduced by 5.3.
- **Dependencies on archived changes:** 1.13 `add-population-growth` (archived 2026-10-21) and 3.4 `add-maintenance` (archived 2026-10-22).

## Out of Scope

- 5.2 `add-storage-providers`: storage entities expanding capacity or throughput.
- 5.3 `add-golden-throughput-throttling`: the SCN-10 scenario and its golden.
- 5.4 `add-client-throughput-indicators`: the client gauge, overlay, and throttle display; R1 storage module.
- 6.4 `add-transport-orders-and-stations` and 6.5 `add-transport-quantity-rules`: transport handling throughput requests (phase 09 records none until transport exists).
- Explicit internal transport (phase 14/15) and the connected-graph access policy.
