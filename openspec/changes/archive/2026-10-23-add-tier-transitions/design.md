# Design

## Context

The `transition` store kind exists but is unused; phase 24 is a no-op. Content data is read in core through `Registry.definitionDataOf` (design D3 of 3.2), as bands (7.2), service providers (7.6), and unlocks (7.5) already do. Costs must flow through the transaction builder so purpose locks and atomicity apply (7.4).

## Goals / Non-Goals

- Goals: content transitions, manual/automatic/decline triggers, atomic costs, conversion, refunds, empty-residence policies.
- Non-Goals: scheduled triggers (no scheduler), client UI (7.9), eligibility read models (7.7), goldens (7.8).

## Decisions

### D1 — Content shapes

`transitions` maps to the existing `transition` definition type. `cost_source` is accepted as `location_inventory` only (CONT-6.15); `cost_access_purpose` as `population_transition`. `conversion.entity_definition` names the target residence definition; `conversion.population` accepts the CONT policy names (`retain_count_clamped` is treated as `clamp_to_target_capacity`). Tier `decline_transitions` and residence `empty_residence` are added to their schemas. Reference checks cover tiers, condition, costs, refund resources, conversion definition, tier decline transitions, and empty-residence revert targets.

### D2 — Cost atomicity

`withdrawCosts` first verifies the total accessible quantity per cost line (via the `shared_location` policy with purpose `population_transition`), then stages withdrawals across inventories in ascending order inside one `tx.atomic`. A shortage therefore rejects before any state change, and purpose locks are enforced by the transaction builder (7.4). Costs are consumed at start (GDD-13.1).

### D3 — Conversion and re-instantiation

On completion, the target entity definition is re-instantiated by `residenceFromDefinition` (tier, capacity, growth policy, outputs, needs, categories, aggregation, bands) from raw definition data, then the population conversion is applied against the source and target capacities. This keeps core content-free while producing a correct new-tier residence; the app's instantiation logic is the source of the same shape. Without a target definition, only the tier and capacity change.

### D4 — Triggers

Manual: the command (phase 01). Automatic/condition_duration: phase 24 scans residences in ascending entity ID and starts a matching transition when its condition holds (the injected condition evaluator). Decline: when `bandState.declineGraceTicks` is reached, the band's named transition (resolved in phase 22) or the tier's single `decline_transitions` entry starts. `scheduled` is accepted and not auto-started; the manual command remains available. Band effects now resolve the named transition handle and carry `declineGraceTicks`/`declineTransition` in `bandState` (closing the 7.2 deferral).

### D5 — Empty residences

Phase 24 scans zero-population residences without a running transition. `retain` does nothing; `revert` re-instantiates the configured definition (guarded against self-revert); `decay` writes a `constructionProgress` with `deconstructAt = tick + delay`, so phase 30 removes the entity through the existing lifecycle path.

### D6 — Events and errors

`TransitionStarted` and `TransitionCompleted` are emitted with the transition handle; no event catalogue is typed beyond `string`. New error codes `invalid_transition`, `not_eligible`, and `insufficient_quantity` join the registry. No new store kind is introduced, so existing goldens are unchanged.

## Clarifications recorded (no normative amendment)

- `retain_count_clamped` (CONT-6.15) and `clamp_to_target_capacity` (GDD-13.3) are the same policy (D1).
- Costs are paid at start and refunded at completion, matching GDD-13.1/13.3.
- Decline via a band uses the band's named transition, else the tier's single decline entry (GDD-12.6).

## Risks / Open Questions

- `residenceFromDefinition` duplicates the app's instantiation logic; consolidating it is deferred until a later row needs it.
- Phase 24 scans residences and transition definitions per tick; content sizes keep this small (M7 benchmark note).
