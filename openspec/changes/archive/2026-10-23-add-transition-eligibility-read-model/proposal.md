# Proposal

## Why

Roadmap 08, M7 item 7.7 (`add-transition-eligibility-read-model`). Phase 24 can start transitions, but a client cannot explain why a residence can or cannot advance: PIC-10.1's residence summary carries population and satisfaction only, and GDD-13.1's condition checklist — including sustained-timer progress — is invisible. This change exposes the checklist, completing the read-model leg of progression (R-08 legibility).

## What Changes

- The entity detail read model's `residence` gains `transition_eligibility`: one entry per transition whose source tier matches the residence, with `transition_id`, `eligible`, `advancement_enabled`, and a `conditions` checklist.
- Each checklist reports the transition's overall condition and every `sustained` node with its required ticks, current progress, and whether it is met (TDS-14.3 timer state).
- `enable_advancement` from the residence's satisfaction band gates advancement transitions (declines are not gated).
- Additive protocol DTOs `TransitionEligibilityDto` and `TransitionConditionDto`; the entity-detail codec passes the `residence` object through.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `app/projections`: the residence read model exposes transition eligibility.

## Impact

- **Packages:** `@aesfw/app` (read model), `@aesfw/protocol` (additive DTOs and codec passthrough).
- **Tick phases:** none (derived read model).
- **Store kinds:** none. **Commands/events/errors/diagnostics:** none.
- **Protocol/save format:** additive optional fields; no version bump. **HASH-CHANGING:** no.
- **Dependencies on archived changes:** 7.3 `add-tier-transitions` (archived 2026-10-23) and 2.4 `add-core-read-models` (archived 2026-10-22).

## Out of Scope

- 7.8 `add-progression-goldens`: scenarios and goldens.
- 7.9 `add-client-population-and-transitions`: the client pyramid, checklist UI, and transition command.
