# Proposal

## Why

Roadmap 08, M4 item 4.7 (`add-client-economy-and-planning`), the final M4 row. The owner economy (4.4) and planning (4.5) read models exist but the client cannot see them: the top bar shows no balance, no view renders PIC-10.6/10.5 data, and the planning read model has no host query path. This delivers M4's demo — "a player sees why a chain loses money and how many inhabitants it supports" — and adds the R1 credits and maintenance content that gives the numbers life.

## What Changes

- Reference content R1: a `ref.tier.resource.credits` balance resource, a credits income output on tier S1 (`10` per population per tick, 07 §4), and maintenance on the four R1 production entities (60-tick interval, R1-tuned quantity).
- Top bar: a credits readout for the actor's balance.
- An economy drawer view (REF-12.4): balance, net rate, a client-side trend sparkline, revenue and expenses by source, idle-but-paying entities, deficit-paused entities in pause order, and a `ResumeDeficitPausedEntities` (resume-all) command button.
- A planning drawer view (REF-12.4): per consumed resource, net rate and per-tier supported population, per-capita, population, and coverage; the chain table with stage counts and integer ratios.
- A host `planning` query kind serving `planningMetrics` (the 3.7b pattern: a read model the client needs gets host message handling in the consuming row).
- Drawer toggle via top-bar buttons and the pure keyboard helpers (`E` economy, `P` planning), i18n keys, styles, and `data-testid`s per REF-16.

## Capabilities

### New Capabilities

### Modified Capabilities

- `reference/client`: ADDED requirements — the economy view, the planning view, the top-bar balance, and the drawer/keyboard behavior.
- `host/web`: ADDED requirement — the `planning` query kind in `answerQuery`.
- `reference/content`: ADDED requirement — R1 credits, income, and maintenance content.

## Impact

- **Packages:** `@aesfw-ref/client-web` (selectors, views, wiring), `@aesfw/host-web` (query case), `reference/content` (R1 economy content).
- **Tick phases:** none. **Protocol:** no DTO changes (the planning DTO landed in 4.5; queries are generic JSON objects).
- **Not hash-changing:** reference content has no committed scenario golden; the client never hashes.
- **Dependencies on archived changes:** 4.4 `add-owner-economy-read-model`, 4.5 `add-planning-metrics-read-model`, 3.8 `add-client-placement-mode` (all archived 2026-10-22).

## Out of Scope

- Balance trend persistence beyond the client session (sparkline history is client-local, last 60 samples).
- Logistics and exchange drawer tabs (M6/M9 rows own them).
- The deficit policy in R1 reference content: with no exchange starting capital yet (M9), an early deficit would deadlock the growth loop; R1 ships credits and maintenance only, and the spiral is demonstrated by the framework's `demo-loss-spiral` fixture (4.6). R1's deficit policy lands with the M9 exchange economy.
- Playwright e2e additions: existing smoke flows run on the build/verification box (CI L7); this change adds no new e2e flows.
