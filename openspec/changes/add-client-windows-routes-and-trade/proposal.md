# Proposal

## Why

Roadmap 08, M11a item 11.4e. The action-bar windows are still the re-hosted dashboard drawers from 11.4a. This row delivers the final §12.4 window set — statistics/planning, routes, exchange, and the new log window — plus the explore/establish entry points from the world canvas, completing the REF-12 view surface the M11a playtest script exercises ("explores and establishes a second location, runs a transport route, completes one exchange trade").

Depends on: `add-client-context-panels` 11.4d (proposed in this batch — must be archived first; it owns the panel/hand-off surfaces the windows prefill from). Order within M11: after 11.4d; parallel with 11.4f; before 11.4.

## What Changes

- The provisional window re-host is replaced by the REF-12.4 window set over the canvas, opened from the action bar, closed with Escape:
  - **Statistics:** balance and trend, revenue/expenses by source, idle-but-paying entities, deficit-paused entities in pause order with the resume control, the tier pyramid per location and owner, capability supply versus demand.
  - **Planning:** per consumed resource the net rate, per-tier per-capita demand, supported population, coverage, and the chain table with stage counts and integer ratios (unchanged selector).
  - **Routes:** transport units and orders, the route editor with station list, actions, quantity rules, and price limits.
  - **Exchange:** quotes per exchange (buy/sell versus base, volume, recovery estimate) with the trade-order shortcut that prefills a route draft.
  - **Log:** domain events as text lines, filterable by type, location, and entity; clicking selects the subject.
- Explore and establish start from the world canvas: an unknown or unestablished island opens the routes window prefilled with the single-station draft (the location panel and island selection hand off to the same flow).
- The economy/planning/logistics/exchange/population drawer views and their dashboard-era keyboard mapping are removed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/client`: the drawer requirements become window requirements; the log window and canvas-initiated expansion are added.

## Impact

- **Packages:** `reference/client-web` (window host content, selectors, event filtering). No framework package changes; no phases, store kinds, error codes, or diagnostic codes.
- **Commands:** `ResumeDeficitPausedEntities`, `CreateTransportOrder`, `ModifyTransportOrder`, `DeleteTransportOrder`, `AssignTransport`, `UnassignTransport` — all existing.
- **Read models:** owner economy, planning, transport detail, exchange quotes, events (PIC-10, PIC-11).
- **Goldens:** none.

## Out of scope

- `add-client-news-and-milestones` (11.4f): the news rail (a separate HUD region) and hints.
- `add-client-polish-and-accessibility` (11.4): window focus management polish, command palette, axe.
- `add-client-performance-pass` (11.6): window render budgets.
- Scenario objectives (13.2, M13).
