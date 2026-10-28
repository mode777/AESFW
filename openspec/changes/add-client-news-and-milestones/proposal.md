# Proposal

## Why

Roadmap 08, M11a item 11.4f. A game tells the player what is happening and what to reach for: the redesigned HUD reserves a news rail for recent events and pending warnings, contextual hints explain block reasons and rejections, and a client-side milestone tracker gives the opening hours direction (REF-12.6) — the tutorial substitute that 07 §17 explicitly keeps in scope. Without these, the M11a playtest's "player who has not read the documents" has no guidance layer, which is the last leg of **R-08**.

Depends on: `add-client-context-panels` 11.4d and `add-reference-content-prototype` 11.1 (both proposed in this batch — must be archived first; 11.4d owns selection/camera jumping, 11.1 the R3 balance data the milestone list is tuned to). Order within M11: after 11.4d and 11.1; parallel with 11.4e; before 11.4.

## What Changes

- The news-rail slot (left HUD region) renders a bounded list of recent domain events of interest (shortages, blocks, declines, unlocks, deficit pauses, establishments, trades) plus pending warnings derived from the current projection; each entry selects its subject and moves the camera to it.
- Contextual hints: short localized strings derived from block reasons and command rejections (e.g. "Missing input H1: build a refiner"), shown as toasts and attached to their subject; hints name what is wrong and never compute mechanics.
- A client-side milestone tracker: milestones are client data in `reference/client-web`, each a predicate over projected facts only (a definition's `locked` flag cleared, population per tier reaching a value, locations established, transport orders created, a domain event seen); completion is stored client-locally per save slot and never affects the game (PIC-16).
- The milestone list covers the M11a playtest opening script (first chain, first advancement, second location, first route, first trade).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reference/client`: the news rail, hints, and milestone tracker are added.

## Impact

- **Packages:** `reference/client-web` (news view, hint selectors, milestone data and predicates, localStorage per save slot). No framework package changes; no phases, store kinds, commands, events, error codes, or diagnostic codes.
- **Protocol:** none — events, projections, and definition metadata only (PIC-11, PIC-9, PIC-4).
- **Goldens:** none.

## Out of scope

- `add-client-polish-and-accessibility` (11.4): hint/notice aria polish, reduced motion for rail updates.
- Tutorials, narrative onboarding, and audio (07 §17 non-goals).
- Server-side objectives (13.2 `add-scenario-objectives`, M13).
- Live unlock-progress projections (redesign R4; future `app/projections` row).
