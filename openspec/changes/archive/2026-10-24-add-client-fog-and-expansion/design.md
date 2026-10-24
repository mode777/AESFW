# Design

## Context

8.4 made the snapshot authoritative-but-filtered: an unknown location reaches the client as `{ entity_id, knowledge: 'unknown', inventories: [] }` plus connections, so the client cannot leak what it does not hold. The map already class-ifies locations by knowledge; the missing pieces are interaction and the explore/establish drafts.

## Decisions

### D1 — Fog rendering is class-driven

The view renders `knowledge-unknown|discovered|established` classes it already receives; CSS does the rest (unknown: dashed, transparent, dimmed; discovered: accent stroke; established: bold). The unknown label is the location ID alone; the owner mark is suppressed for unknown locations. No attribute rendering is attempted because none is received (PIC-9.3).

### D2 — Selection and the action bar

Clicking a location toggles a client-local selection (`WorldMapSelection`: id, knowledge, active, owner); the action bar renders from it: Deactivate/Activate (known only) issues the map commands of REF-12.1, and Explore/Establish build a single-station draft, switch the drawer to logistics, and call the editor's new `prefill`. Selection is client-local view state, cleared after an action or on re-click.

### D3 — Draft validation gains a mode rule

`draftValid` required every station to carry actions; explore and establish drafts are action-less by design. The validator accepts an action-less station exactly when the draft mode is `explore` or `establish`; a `route` draft still requires valid actions. `exploreDraft`/`establishDraft` are pure builders (mode, `repeat: false`, one station).

### D4 — Grid suppression

`currentLocation` skips a location whose snapshot knowledge is `unknown`: its grid, properties, and aggregates are not in the snapshot, so there is nothing to draw. The map remains the surface for unknown locations.

## Clarifications recorded (no normative amendment)

- The map's `active` flag defaults to `true` client-side when the snapshot omits it; for unknown locations the flag is unused (the dashed class wins), so no hidden state leaks.
- The action bar is positioned client-local inside the map frame and is not part of the view-state store (single selection, no persistence).

## Risks / Open Questions

- The live explore → establish playthrough depends on CI's browser stage; the selector tests cover the pure model, per the client testing rules (VER-13).
