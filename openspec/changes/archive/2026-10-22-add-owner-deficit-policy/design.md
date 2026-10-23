# Design

## Context

`OwnerState.deficitPaused` already exists (encoded, hashed), production preconditions already emit `paused_by_deficit` block reasons from it, and 4.2's maintenance already skips deficit-paused entities — INV-11's mechanics exist; only the writer of the state is missing. Phase 27 is a registered no-op. `deficitPolicy` is a `DefinitionType` without schema, collection, or runtime. The core `Registry` interface has only point lookups (`stringIdOf`, `handleOf`, `definitionDataOf`) — no enumeration.

## Goals / Non-Goals

- Goals: the loss spiral is fully deterministic; pausing is reversible and distinct from `SetEntityEnabled`; content defines the policy, core stays content-free; no save-format or new-store change.
- Non-Goals: bankruptcy/defeat states (there are none by design), exchange purchases in the net rate (M9), per-actor policy selection (13.4), the owner economy read model (4.4), the SCN-04 golden (4.6).

## Decisions

### D1 — Policy delivery via `Registry.handlesOf`

Core gains an optional `handlesOf(type): readonly DefinitionHandle[]` on the `Registry` interface; `@aesfw/content`'s compiled registry implements it from its per-type handle buckets (already sorted by ascending handle, hence ascending string-ID order). Phase 27 enumerates `handlesOf('deficitPolicy')`, reads each policy via the existing `definitionDataOf`.

- Alternatives: hanging the resolved policy on a component — there is no owner entity to hang it on, and adding a component kind risks encoding churn; a new `World` field changes the save format. Enumeration is additive, optional, and keeps the content-free rule (TDS-4.3).

### D2 — Net-rate semantics (v1 interpretation, recorded)

`net_rate_non_negative` holds when `incomePerTick ≥ expensePerTick` for the policy resource:

- `incomePerTick` = Σ over residences owned by the owner (via the 4.2 `owner` component) of `floor(count × rate × curve(z) / 1000)` for income outputs of the resource — the same shape phase 26 credits, so the estimate tracks actual credits.
- `expensePerTick` = Σ over the owner's currently charging maintenance entities of `floor(due(resource) / intervalTicks)`.

Floor division keeps everything in safe integers; the estimate intentionally ignores arrears, exchange flows (M9), and transport maintenance (6.2), which later rows fold into the same comparison.

### D3 — Pause algorithm

Per owner (ascending), per policy (ascending handle): if `compare(balance, trigger)` holds, build the candidate list (owned entities with a maintenance component charging the resource, not already paused, definition tags disjoint from `exclude_tags`), sort by the configured `order` (`maintenance_desc` = due for the resource descending, `entity_id_asc` tiebreak), and pause one at a time — appending to `deficitPaused` and emitting `DeficitPaused` — re-evaluating the stop condition after each. Pausing affects the *next* tick (TDS-11.3 rule 4), so the stop condition evaluates projected rates of still-charging entities only; `isCharging` already excludes paused entities.

### D4 — Resume semantics

`automatic_reverse_order`: when `compare(balance, resume.when)` holds, resume **all** currently paused entities in reverse pause order (pop from the end), emitting `DeficitResumed` per entity. This is the literal reading of GDD-20.3; a re-deficit re-pauses in the same deterministic order, so oscillation is a content-balance outcome, not a framework ambiguity. `manual` and `disabled` skip the automatic path. The `ResumeDeficitPausedEntities` command (phase 01) removes named entities — or all of the actor owner's — from `deficitPaused`; it validates entity existence with the existing `unknown_entity` code.

### D5 — Entity tags

`tags` becomes an optional entity-definition field (CONT-6.8). Core reads them content-free from `definitionDataOf('entity', handle).tags` (the `sim/placement/definition.ts` precedent). Existing content carries no tags, so definition data and the registry checksum are unchanged — **not hash-changing**; only the published JSON Schema export changes.

### D6 — INV-23 check

`checkOwnerBalanceConservation` (testkit) mirrors the INV-04 journal model: when the journal is present, for each owner and resource, `after − before` must equal the sum of `account` deltas (plus `trade` deltas when the union gains them) for that owner and resource. Journal-less runs skip the check, matching INV-04's contract (06 §8: journal invariants force `journal: true` in their tests).

## Risks / Trade-offs

- [Oscillation when a structural deficit sits at balance ≈ 0] → accepted as content balance; re-pause is deterministic and the reference order makes pause/resume cycles converge to the same set.
- [`handlesOf` grows the core Registry interface] → optional method, mirroring `definitionDataOf`; the empty registry returns an empty list.
- [Floor-based per-tick expense estimate can under-estimate lumpy intervals] → the estimate only gates pausing; the authoritative charge still happens per interval with its own shortage policy.

## Migration Plan

No save-format or protocol change. `deficitPaused` writes change world hashes only for content that runs a deficit; the `demo-basic-loop` golden (no deficit policy, no maintenance) is unaffected. `demo-economy` gains a deficit policy and its scenario is asserted, not golden-hashed.

## Open Questions

None.
