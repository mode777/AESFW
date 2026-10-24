# Proposal

## Why

Roadmap 08, M8 item 8.2 (`add-knowledge-and-exploration`). GDD-16.1's fog — a per-owner knowledge state of `unknown`, `discovered`, or `established` per location — is only seeded today: 6.1 stores `OwnerState.knowledge` and 2.3's projections already report the level, but phase 18 is a registered no-op, so nothing is ever discovered at runtime, and `explore` orders are accepted by the gateway but never planned or executed (every transport system gates on `mode !== 'route'`). Expansion is therefore not yet a decision under incomplete information (GDD-16.2). This change adds discovery on arrival, executable explore orders, and the knowledge-monotonicity invariant INV-14, retiring the discovery half of R-11.

## What Changes

- Phase 18 `resolveArrivals` reads phase 16's arrival records and raises the arriving unit owner's knowledge of the location to at least `discovered`, in arrival order, preserving `established`. A transition from `unknown` emits a `LocationDiscovered` domain event carrying the owner and location (the fields per-actor event filtering uses from 8.4); repeat arrivals and non-transitions emit nothing.
- `explore` order mode becomes executable: `planTransportOrders` and `advanceTransportOrders` accept `route` and `explore`; an explore order's stations carry no actions, so arrival advances the station cursor and no handling is requested. `trade` and `establish` remain accepted-but-dormant (9.2, 8.3).
- The testkit invariant harness gains INV-14: per owner and location, knowledge never decreases (`unknown < discovered < established`) across a tick, and entries stay sorted by ascending location.

## Capabilities

### New Capabilities

- `sim/exploration`: owner knowledge state, discovery on arrival, and explore orders.

### Modified Capabilities

- `testkit/harness`: the INV-14 invariant check.

## Impact

- **Packages:** `@aesfw/core` (phase 18, explore-mode gates in the transport order systems, `LocationDiscovered` event), `@aesfw/testkit` (INV-14 in `checkInvariants`), `fixtures/` (theme-free exploration coverage on the existing two-location logistics fixture pattern).
- **Tick phases:** phase 18 `resolveArrivals` (reads the arrival scratch record, writes `owners`); phase 16 mode gates widened (no read/write set change).
- **Store kinds:** none new. **Commands:** none new (`CreateTransportOrder` already accepts `mode: explore`). **Events:** `LocationDiscovered` added. **Error codes:** none. **Diagnostic codes:** none.
- **Protocol/save format:** unchanged (the event DTO payload is generic JSON; knowledge was already saved and hashed). **HASH-CHANGING:** no — existing fixtures never move units to unknown locations, so `owners.knowledge` is unchanged for every shipped scenario.
- **Dependencies on archived changes:** 6.4 `add-transport-orders-and-stations` (archived 2026-10-23).

## Out of Scope

- 8.3 `add-location-establishment`: the `establish` order mode and the establishment transaction.
- 8.4 `add-fog-filtered-projections`: per-actor filtering of projections, read models, and events (including `LocationDiscovered`).
- 8.6 `add-client-fog-and-expansion`: client explore/establish flows.
- Reveal-by-condition (GDD-16.1's "configured condition"): the `knowledge_state` domain query stays a registered name without an evaluator; no roadmap row owns condition-driven reveals yet.
