# Proposal

## Why

Roadmap 08, M6 item 6.4 (`add-transport-orders-and-stations`). Units can follow a path after 6.3, but nothing creates orders, assigns units, or loads and unloads cargo. This change adds runtime route orders, station cursors, handling phases, failure policies, and the transport commands of ARCH-7.3, retiring the remaining M6 logistics gap between a connection graph and a working supply line.

## What Changes

- New content collection `transport_order_templates` (CONT-9): mode, failure policies, and scheduling defaults.
- Runtime order entities carry a `transportOrder` component; assigned units carry `transportAssignment`, `stationCursor`, and `route` state.
- New commands `CreateTransportOrder`, `ModifyTransportOrder`, `DeleteTransportOrder`, `AssignTransport`, and `UnassignTransport`, mapped from client payloads and applied in phase 01.
- Phase 14 plans a path from the unit's current location to the current station with `shortest_stable`; phase 16 stages loading and unloading within the handling rates and the location's throughput; phase 19 commits the transfers through the transaction writer.
- Handling requests participate in the existing throughput pool (phase 09/10) and are throttled by `throughput_permille`.
- Failure policies `skip`, `wait`, `retry`, `return`, `fail`, and `retain` are applied to path and handling failures.
- Route orders repeat from the first station when `repeat: true`; otherwise the unit is unassigned after the last station.
- Theme-free tests for order commands, load/travel/unload, throughput throttling, repeat, and failure policies.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sim/transport`: runtime orders, stations, handling, throughput participation, failure policies, and transport commands.
- `content/schemas`: the transport-order template schema and its collection.

## Impact

- **Packages:** `@aesfw/core` (`sim/transport/orders`, phases 01/09/14/16/19, command union), `@aesfw/content` (order-template schema and collection), `@aesfw/app` (command mapping), `@aesfw/testkit` (integration tests).
- **Tick phases:** phase 01 applies transport commands; phase 09 collects handling requests; phase 10 allocates them with the existing pool; phase 14 plans station paths; phase 16 advances movement and stages handling; phase 19 commits transfers.
- **Store kinds:** existing `transportOrder`, `transportAssignment`, `stationCursor`, `route`, `movement`, `cargo`, `handling`, `inventory`, `ledger`. No new store kind.
- **Commands/events:** five transport commands; events `TransportHandled`, `TransportLoaded`, `TransportUnloaded` (plus existing `TransportArrived`, `CommandApplied`, `CommandRejected`).
- **Error codes:** existing `unknown_entity`, `unknown_location`, `unknown_definition`, `unknown_command`. **Diagnostic codes:** none new.
- **Protocol/save format:** no protocol version change. Existing goldens are unchanged because no existing fixture creates an order.
- **Dependencies on archived changes:** 6.3 `add-route-planning-and-movement` (archived 2026-10-23) and 2.2 `add-session-and-command-gateway` (archived 2026-10-22).

## Out of Scope

- 6.5 `add-transport-quantity-rules`: the non-basic quantity rules (`excess_above`, `deficit_below`, `maintain_origin_minimum`, `maintain_destination_target`, `priority_list`) are parsed but return zero until 6.5.
- 6.6 `add-transport-read-model`: transport detail and events read model.
- 6.7 `add-golden-logistics-loop`: SCN-02.
- 8.2 `add-knowledge-and-exploration`, 8.3 `add-location-establishment`, and 9.x exchange trades: `explore`, `establish`, `trade`, `buy`, and `sell` are accepted but not executed.
- Explicit internal transport (phase 15).
