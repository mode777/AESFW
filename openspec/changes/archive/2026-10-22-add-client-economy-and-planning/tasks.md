# Tasks

## 1. Reference content

- [x] 1.1 [REF-5, REF-7] Add `ref.tier.resource.credits` (owner scope, `allow_negative`), the S1 credits income output (`10`/population/tick), and maintenance (60 ticks, `6000` credits) on the four R1 production entities (D3). Verify: `aesfw validate reference/content/ref.tier --strict` exits 0; `reference/content/test/ref-tier.test.ts` stays green with empty findings.

## 2. Host

- [x] 2.1 [PIC-10.5, TDS-21.1] Add the `planning` query kind to `answerQuery` serving `planningMetrics(session, session.settings.actor)`; malformed and session-less queries return empty results. Verify: host-web unit test (two scenarios).

## 3. Client selectors and state

- [x] 3.1 [REF-12.4, PIC-10.6] `selectors/economy.ts`: owner balance view model (credits, net, source rows, idle-paying, paused), `pushTrend` ring buffer. Verify: selector unit tests.
- [x] 3.2 [REF-12.4, PIC-10.5] `selectors/planning-view.ts`: per-resource tier rows and chain table rows from a `PlanningDto`. Verify: selector unit tests.
- [x] 3.3 [REF-13.4] `drawerAction` pure helper in `view-state.ts` for the `E`/`P` keys. Verify: view-state unit tests.

## 4. Client views and wiring

- [x] 4.1 [REF-12.4, REF-16] `views/economy.ts` (balance, net, sources, idle-paying, paused + resume-all control, sparkline) and `views/planning.ts` (tier tables, chain table); i18n keys; `data-testid`s; styles. Verify: build passes; selectors are the only logic under test.
- [x] 4.2 [REF-12.4, REF-14.3] Top-bar credits readout (`formatBaseUnits` with the reference scale). Verify: build passes.
- [x] 4.3 Wire `main.ts`: drawer rendering, top-bar economy/planning buttons, `E`/`P` keys, trend history on published snapshots, planning query on open and while visible. Verify: build passes.

## 5. Verification

- [x] 5.1 Run `pnpm verify` (client unit tests, dependency rules) and `pnpm trace` (REF-12.4 lands); e2e remains on the build/verification box (CI L7).
