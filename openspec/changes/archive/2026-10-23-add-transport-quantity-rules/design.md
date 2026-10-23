# Design

## Context

6.5 completes the rule set that 6.4's handling loop already calls. No new store, phase, or command is introduced.

## Decisions

### D1 — Rules are directional

`actionTarget` receives the station action and the target inventory. It decides the acting side from `action.action`: `load`/`buy` act on the origin inventory and cargo free space; `unload`/`sell` act on cargo and the destination inventory. This is the only interpretation that makes every rule meaningful in both directions.

### D2 — Priority list is first-fit

`priority_list` is a list of candidate quantities. The first candidate that fits both the acting side and the receiving side is used. If none fits, the target is zero. This keeps the rule deterministic and avoids a second allocation algorithm.

### D3 — Clamping

Every rule is clamped by the available acting-side quantity (`min(target, inventoryQuantity)` for load, `min(target, cargoAmount)` for unload). The transaction layer still rejects a deposit that exceeds destination capacity; in that case cargo is unchanged (6.4 D2).

## Phases and stores

No phase or store changes. Phase 16 reads the target; phase 19 commits it.

## Ordering and rounding

No division or rounding is introduced. Rules are evaluated once at action start and stored in `stationCursor.target` (6.4 D3).

## Amendments

No amendment to 01–04 is required.

## Risks

- `all` on a load is interpreted as "all that fits and is available"; GDD-15.3's wording is terse. Recorded as a clarification.
- Reservations are not subtracted from the origin quantity when computing a target; a reservation can still make the phase 19 withdrawal fail, and the action retries. This is consistent with 6.4's failure policy.
