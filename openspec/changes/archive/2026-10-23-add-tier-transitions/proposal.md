# Proposal

## Why

Roadmap 08, M7 item 7.3 (`add-tier-transitions`). Residences never change tier: there is no transition content, no `RequestPopulationTransition`, and phase 24 is a no-op, so the progression pyramid (GDD-13) and the asymmetry between paid advancement and unrefunded decline (GDD-3.7) are absent. This change delivers the generic transition engine, triggers, atomic cost payment with the `population_transition` purpose, conversion and refund policies, empty-residence policies, advancement and decline, retiring R-08's pyramid mechanic and unblocking 7.7/7.8.

## What Changes

- New `transitions` content collection (CONT-6.15, `transition` definition type): source and target tier, optional trigger (`manual_command`, `automatic`, `scheduled`, `condition_duration`), condition, costs, cost source and purpose, refund policy (`none`, `fraction`, `resources`), `duration_ticks`, and conversion (population policy plus target entity definition).
- Population tiers gain `decline_transitions`; residences gain `empty_residence` (`retain`, `revert` to a definition, or `decay` after a delay).
- `RequestPopulationTransition { entity, transition }` is handled in phase 01: it validates the residence, the source tier, and the condition, pays the costs atomically from the location's accessible inventories with purpose `population_transition` (so purpose locks and throughput rules apply), and starts the transition.
- Phase 24 `advanceTransitions` completes due transitions — population conversion, tier/definition replacement from the target entity definition, and the refund policy — and starts automatic, condition-duration, and decline-after-grace transitions. It also applies empty-residence policies when a residence's population reaches zero.
- Band `trigger_decline` effects now resolve their named transition; the tier's single `decline_transitions` entry is used when the band omits one (closing the 7.2 deferral).
- Theme-free unit coverage for the command, cost atomicity, conversion, refunds, decline, and empty residences.

## Capabilities

### New Capabilities

- `sim/transitions`: the generic tier-transition engine.

### Modified Capabilities

- `content/schemas`: the `transitions` collection, tier `decline_transitions`, and residence `empty_residence`.
- `sim/needs`: band `trigger_decline` transition resolution.
- `sim/population`: band-state decline fields consumed by the engine.

## Impact

- **Packages:** `@aesfw/content` (transition schema and references), `@aesfw/core` (transition definitions, engine, phase 24, phase 01 command, residence re-instantiation), `@aesfw/app` (command parsing), `fixtures/` (theme-free coverage).
- **Tick phases:** phase 01 `applyCommands` (writes `transition`, `inventory`, `ledger`), phase 24 `advanceTransitions` (writes `residence`, `populationGroup`, `transition`, `definition`, `growth`, `constructionProgress`, `lifecycle`, `inventory`, `ledger`), phase 22 (band decline fields).
- **Store kinds:** `transition` (already a v1 catalogue kind; values become populated). **Commands:** `RequestPopulationTransition`. **Events:** `TransitionStarted`, `TransitionCompleted`. **Error codes:** `invalid_transition`, `not_eligible`, `insufficient_quantity`. **Diagnostic codes:** none new.
- **Protocol/save format:** no change; `transition` is already encoded and hashed. **HASH-CHANGING:** no — no shipped fixture defines transitions, so existing goldens are unchanged.
- **Dependencies on archived changes:** 7.2 `add-satisfaction-bands` (archived 2026-10-23) and 3.2 `add-construction-lifecycle` (archived 2026-10-22).

## Out of Scope

- 7.7 `add-transition-eligibility-read-model`: condition breakdown and sustained progress in projections.
- 7.8 `add-progression-goldens`: SCN-03/07/08/09/11/12 scenarios.
- 7.9 `add-client-population-and-transitions`: the client pyramid and transition command UI.
- Scheduled triggers: no scheduler exists in v1; `scheduled` is accepted and not auto-started (manual command still works).
