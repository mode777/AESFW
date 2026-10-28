# Design

## Context

See proposal.md "Why". 11.4a's window host already floats re-hosted drawer views with Escape handling; the selectors behind them (economy with by-source rows and resume, planning query, logistics/route editor with all GDD-15.3 rules and price limits, exchange quotes with the trade shortcut, population/progression) are tested and were carried over unchanged. The event log today is a notice strip; the mirror receives all events already.

## Goals / Non-Goals

**Goals:**

- The REF-12.4 window set as first-class windows with one open/close mechanism and a stable keyboard map.
- The explore/establish flow entered from the canvas (the playtest's second act).
- No selector rewrite: content moves, selectors persist.

**Non-Goals:**

- News rail and hints (11.4f); palette/focus polish (11.4); per-window performance budgets (11.6); protocol or read-model changes.

## Decisions

### D1. Window registry replaces the provisional re-host

`windowHost` becomes a registry: each window registers `{id, title, mount, update}`; view state holds the open windows as an ordered stack (most recent on top, bounded to two simultaneous windows to protect the canvas); `Escape` pops the top. Action-bar toggles and keyboard keys push/pop by id. The provisional drawer views are deleted; their selectors feed the new window contents.

### D2. Log window data

The mirror already accumulates the event stream; the log view keeps a bounded client-local ring (last 200 events, view-only per PIC-16) with pure filters (`logLines(events, filter)` — type set, location id, entity id; newest first). Line text is localized event descriptions with subject references; click selects the subject (entity or location) through the normal selection path.

### D3. Statistics window composition

Reuses the economy selector as-is plus two additions: the pyramid (per location from summaries, plus owner totals — the existing progression selector data) and capability supply versus demand (from definition metadata capability declarations and the location summary's capability data — both projected; display-only aggregation by ascending capability ID). The sparkline stays client-local history (M4 note).

### D4. Explore/establish flow

Entry points: island selection at world level (canvas) and the location panel's buttons (11.4d). Both call one pure `expansionDraft(mode, island)` and open the routes window at the editor with the draft prefilled — the same validator rules as today (action-less stations legal exactly for `explore`/`establish`). The EP cost displays from definition metadata beside the draft (A14 display rule). 8.3's establishment executes on arrival exactly as in M8; nothing new is computed client-side.

### D5. Keyboard map

`E` statistics, `P` planning, `L` routes, `X` exchange, `G` log (new). `R` remains ghost-rotate; `V` (population drawer) is freed — its content lives in statistics (pyramid) and the minimap strip. Recorded here because 07 §13.2 lists only some keys; the final complete map is normalized by 11.4.

## Risks / Trade-offs

- [Two-windows cap may surprise users] → cap documented in the action bar (second toggle closes the oldest); protects the ≤ 1024 px layout.
- [Event ring memory on long sessions] → bounded ring; the log is lossy view state by design.
- [Drawer-key muscle memory breaks (`V` gone)] → freed key is re-owned by 11.4's complete map if at all.

## Migration Plan

- Provisional window contents are replaced in place; selectors and their tests carry over. Rollback = revert.
