# Design

## Context

All data the two views need exists after 4.4/4.5: the projection's `owners[].balance` (with by-source maps, idle-paying, paused entities, updated via `owner_updates`) and the `planningMetrics` read model. The client never reads `owners` yet; the planning read model has no host path. The drawer signal exists unused in view state. Reference content has credits neither as a resource nor as income, and no maintenance.

## Goals / Non-Goals

- Goals: every on-screen number traces to a projection or read-model field (selector unit tests); pure helpers for the keyboard map; additive host wiring following the 3.7b placement-query pattern.
- Non-Goals: logistics/exchange tabs, new e2e flows, balance history persistence, R1 deficit policy (see D3).

## Decisions

### D1 — Drawer over the existing layout

The `drawer` signal gains values `'economy' | 'planning' | null`. The two views render as an overlay panel anchored to the right column when set; the existing inventory/population tables stay. Top-bar buttons and the `E`/`P` keys toggle via a pure `drawerAction(current, key)` helper in `view-state.ts`.

### D2 — Economy view data and trend

`selectors/economy.ts` derives the view model from the projection's actor owner entry: balance resource rows (credits), `net_per_interval`, source rows keyed `tier.*`/`entity.*` (labelled via i18n fallback), idle-paying entity ids, paused entity ids in order. The sparkline keeps the last `60` published `net_per_interval` samples in a client-side ring buffer (`pushTrend` pure helper), rendered as a polyline. The resume control submits `ResumeDeficitPausedEntities` with `entities: 'all'` and lands in the existing command-notice path.

### D3 — R1 credits tuning, deficit policy deferred

Credits income is `10` per population per tick (07 §4). Maintenance quantity is R1-tuned to `6000` per `60` ticks (`1` display unit per minute per building) instead of the Appendix-B conversion `120000` (`20`/min), which targets R4: at the R1 starting population the 20/min figure deadlocks the growth loop (deficit pauses producers → need fulfillment falls below the growth threshold → no population growth → no income growth → no recovery), because R1 has no exchange to supply starting capital (M9). R1 ships credits and maintenance only — exactly the roadmap scope — and the deficit policy content lands with the M9 exchange economy; the spiral itself is demonstrated by the framework fixture (4.6). The connector stays maintenance-free so connectivity survives any future pause ordering.

### D4 — Planning via a host query

`answerQuery` gains `kind: 'planning'` → `planningMetrics(session, session.settings.actor)` posted as `result.planning`. Queries are generic JSON objects, so no protocol change is needed. The planning view issues the query when the drawer opens and on every published snapshot while visible; rendering is a pure selector over the `PlanningDto`.

### D5 — Top bar credits

The top bar shows `Credits <value>` formatted by `formatBaseUnits(amount, 6000)` from the actor owner's `resources['ref.tier.resource.credits']`, plus the net rate. The scale is a named constant citing 07 §4 (the client bundles no presentation package yet; a presentation-driven formatter is a later concern).

## Risks / Trade-offs

- [Owner entries exist for every owner even with zero economy] → the balance object is always populated (4.4), so the top bar renders `0` cleanly.
- [Planning queries per snapshot could be chatty] → only while the planning drawer is visible; the computation is pure over a small world.
- [R1 maintenance changes the existing ref-tier 100-tick test] → the balance goes negative but INV-01 permits balance resources; the test asserts findings stay empty.

## Migration Plan

No protocol or golden changes. The reference client keeps importing only `@aesfw/protocol` and `@aesfw/host-web/client`.

## Open Questions

None.
