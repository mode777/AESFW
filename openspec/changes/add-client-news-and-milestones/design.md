# Design

## Context

See proposal.md "Why". The redesign (D8) settled milestones as client data, not presentation-package content: 04 §5 has no file kind for them and extending it would amend 04. The mirror already receives every event; the camera and selection paths exist (11.4b/11.4d); command notices exist (11.4a/11.4c); 11.1 provides the R3 balance the milestone thresholds are tuned to (150 S1 advancement, 2 locations, trade).

## Goals / Non-Goals

**Goals:**

- News, hints, and milestones as pure selectors over projections/events/presentation data.
- Milestones stored per save slot, discardable, game-neutral.

**Non-Goals:**

- Tutorial flows, narrative, audio (07 §17); scenario objectives as simulation state (13.2); server-side tracking; new protocol fields.

## Decisions

### D1. Newsworthiness is a pure classification

`newsEntries(events, mirror, presentation)` keeps a client-local bounded ring of events (the log's ring from 11.4e, shared — one ring, two projections) filtered to the newsworthy families: `LocationDiscovered`, `LocationEstablished`, `PopulationTransitioned`, `Unlocked`, `DeficitPaused`/`DeficitResumed`, `Traded`, `SatisfactionDeclined` (band crossings), and shortage/block onsets (first tick of a block run, not every tick — dedupe by `(subject, reason)` with re-arm on clear). Pending warnings derive per published projection: blocked entities, deficit-paused entities, residences below the decline band. Both lists sort newest first and cap (rail 20 entries).

- *Alternative: server-side newsworthiness events.* New event types would change the protocol for a presentation concern; rejected.

### D2. Hints as a localization catalogue

`hintFor(kind, subject, presentation)` maps `(block reason | rejection code)` to a localization key (`hint.<code>`); arguments fill from the DTO (resource id, definition id) with names resolved through presentation localization. The catalogue lives in `ref.tier.presentation` localization as generic keys (added by 11.1's file or here as reference data — see D4), so hints are data, not code branches. Toasts reuse the notice path; panels append the hint row for the selected subject.

### D3. Milestone predicates

`milestones.ts` holds the default list: `{id, descriptionKey, predicate}` where predicates read only the mirror (definition metadata locks, location summaries' population by tier, knowledge states, transport-order counts, event-ring facts). Completion detection runs on published projections (a computed); completions append to a per-save-slot store keyed by the host save slot id under `aesfw-ref.client.v2` (07 §14.5). The UI is a small overlay opened from the action bar (or the news rail header), listing locked/complete with descriptions.

- Milestones are not content: they are client data per redesign D8; thresholds (150 S1, second location) are recorded here and tuned with 11.1's balance in one place.

### D4. Where hint strings live

`ref.tier.presentation/localization.en.yaml` gains the `hint.*` keys in this change (reference data, validated by the PIC-19 check). The client falls back to the raw key for missing entries, so an empty presentation package stays usable (11.4a's fallback requirement).

### D5. Jump-to-subject

`focusSubject(subject)` composes existing paths: entity/location selection (11.4d) plus `cameraCentreOn(worldLayout(subject))` (11.4b). One pure helper, no new camera state.

## Risks / Trade-offs

- [Block-onset spam under mass starvation] → dedupe by `(subject, reason)` with re-arm; rail bound; pending warnings aggregate per location when > 3.
- [Milestone thresholds drift from balance changes] → thresholds live only in `milestones.ts`; SCN-14/strategies (11.2/11.3) pin the advancement window, so drift surfaces there.
- [Per-save-slot keying across slots] → the host exposes the slot id; if absent in v1 sessions, fall back to a single list (recorded deviation, still discardable).

## As built

- **News rail** (1.1, 1.2): `newsEntries` lists newsworthy families newest first, capped at `NEWS_LIMIT` (20), with one pending warning per blocked entity. Block onset is deduped through a carry map (`newsCarry`) so a persistent block reports once and re-arms after it clears. Clicking an entry calls `focusSubject` and selects the entity and/or location, moving the camera.
- **Hints** (2.1–2.3): `hintForReason` maps block reasons and command-rejection codes to `hint.*` keys with the raw code as fallback, `hintsForEntity` orders them by the host's block order and appends the deficit pause. The context panel gains a Hints section for the selected entity; command rejections surface through the same mapping. The `hint.*` keys live in `ref.tier.presentation` and are regenerated into the client catalogue; an empty catalogue still falls back to the keys.
- **Milestones** (3.1, 3.2): `DEFAULT_MILESTONES` are the five opening-script predicates (residence, producer, 50 inhabitants, S1→S2 advancement, transport route) over projected facts and location summaries. Completion is persisted per save slot under `aesfw-ref.client.v2:milestones:<slot>`, with `slot.default` as the fallback key (D3/D5). A blocked or missing storage leaves the tracker in-memory and never throws; discarding it never affects the session (PIC-16).
- **Threshold source (D3)**: the 50-inhabitant milestone is a client-local product threshold (REF-12.6), not a simulation rule; it reads the location summaries only.
- **Tests**: `selectors/news.test.ts` covers rail bounding, newsworthy filtering, block dedupe/re-arm, warning marks, hint resolution and order, rejection hints, every milestone predicate, and per-slot persistence including a failing storage.

## Migration Plan

- Additive views and selectors; storage grows one namespaced field. Rollback = revert.
