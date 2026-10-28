# Proposal

## Why

Roadmap 08, M11a item 11.4d. The redesign replaced the inspector-and-tables dashboard with context panels (REF-12.3): the info panel of whatever is selected, sharing the context-panel slot with the build menu. Today that content lives in the old inspector view and loose tables; this row consolidates it into the five panels of REF-12.3 and adds floating status markers — the surface through which the playtest reads residence needs, advancement, hub inventory, and transport state (**R-08**).

Depends on: `add-client-world-canvas` 11.4b (proposed in this batch — must be archived first; it owns the context-panel slot and canvas selection). Order within M11: after 11.4b; before 11.4e and 11.4f; parallel with 11.4c (which owns the slot's build menu).

## What Changes

- The context panel hosts exactly one panel: the build menu (11.4c) when nothing is selected, otherwise the info panel of the selection — residence, producer/service, hub, transport unit, or location (island selected at world level).
- Residence panel: tier with capacity and occupancy, need bars per need (demand, delivery, fulfillment) with category contributions, Z and band, the advancement checklist with sustained-timer progress, and the purpose-lock switches for transition costs.
- Producer/service panel: definition code, lifecycle and enabled/paused state, recipe and progress, inputs/outputs per minute, block reasons, capability request and allocation, maintenance and charge policy, and the panel commands.
- Hub panel: the location inventory (stored, reserved, capacity, purpose locks, net rate per resource) and throughput; location panel: knowledge state, region, ownership, slots and suitability when known, with activation and expansion commands.
- Transport unit panel: order, station list with cursor, cargo by slot, state, failure reasons, assign/unassign.
- Floating status markers above blocked entities at location level (REF-10.3), driving the same block-reason data the canvas glyphs use.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/client`: the inspector and table requirements are consolidated into the context panels; need rows, inventory rows, the transition checklist, and purpose locks move into their panels.

## Impact

- **Packages:** `reference/client-web` (`views/hud/context-panel.ts`, selectors). No framework package changes; no phases, store kinds, events, error codes, or diagnostic codes.
- **Commands surfaced:** `SetEntityEnabled`, `SelectRecipe`, `SetProcessPriority`, `SetCapabilityPriority`, `RequestPopulationTransition`, `SetResourcePurposeLock`, `SetInventoryPolicy`, `AssignTransport`, `UnassignTransport`, `ActivateLocation`, `DeactivateLocation` — all existing.
- **Read models consumed:** entity detail, need breakdown, location summary, transport detail, transition eligibility (PIC-10).
- **Goldens:** none.

## Out of scope

- `add-client-construction-flow` (11.4c): the build menu half of the slot.
- `add-client-windows-routes-and-trade` (11.4e): the windows (statistics/planning, routes, exchange, log) and the explore/establish flow from the canvas.
- `add-client-news-and-milestones` (11.4f): hints and the news rail.
- `add-client-polish-and-accessibility` (11.4): Tab cycling inside panels, axe labelling.
- Table mode: the tables remain as table-mode content (04 §17); only their dashboard framing changes.
