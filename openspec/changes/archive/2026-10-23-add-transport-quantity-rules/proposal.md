# Proposal

## Why

Roadmap 08, M6 item 6.5 (`add-transport-quantity-rules`). After 6.4 a route can load and unload, but only `fixed`, `up_to_capacity`, and `all` produce a target; the remaining GDD-15.3 rules return zero. This change implements every quantity rule so routes can leave reserves, fill destination deficits, and choose a first-fit quantity.

## What Changes

- Implement all GDD-15.3 quantity rules in `actionTarget`: `fixed`, `up_to_capacity`, `all`, `excess_above`, `deficit_below`, `maintain_origin_minimum`, `maintain_destination_target`, and `priority_list`.
- Interpret each rule from the acting side: a load measures the origin inventory and cargo space; an unload measures the cargo and destination inventory.
- Clamp every target by the available quantity so a target never exceeds what the acting side can move.
- Theme-free unit tests for every rule and its boundary.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `sim/transport`: the quantity-rule semantics used by station actions.

## Impact

- **Packages:** `@aesfw/core` (`sim/transport/orders`).
- **Tick phases:** none new; phases 09/14/16/19 consume the completed targets.
- **Store kinds:** none new.
- **Commands/events:** none new.
- **Error codes/diagnostic codes:** none.
- **Protocol/save format:** no change. Existing goldens are unchanged.
- **Dependencies on archived changes:** 6.4 `add-transport-orders-and-stations` (archived 2026-10-23).

## Out of Scope

- 6.6 `add-transport-read-model`: transport detail.
- 6.7 `add-golden-logistics-loop`: SCN-02.
- Price limits and exchange trades (`buy`/`sell`) remain 9.x.
- Reservation-aware inventory availability beyond the existing transaction checks; a failed transaction still leaves cargo unchanged.
