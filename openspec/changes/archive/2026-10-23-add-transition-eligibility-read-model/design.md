# Design

## Context

`entityDetail` builds `ResidenceDto` from the residence and population stores. Transitions are content definitions read through `Registry.definitionDataOf`; conditions compile in `@aesfw/content`; sustained timers live in `world.timers` keyed by `(condition, slot, subject)`.

## Goals / Non-Goals

- Goals: a per-transition checklist with sustained progress; the advancement gate; additive protocol fields.
- Non-Goals: the client UI (7.9), scenario goldens (7.8), transition eligibility for non-residence entities.

## Decisions

### D1 — Read-model shape

`TransitionEligibilityDto { transition_id, eligible, advancement_enabled, conditions }` and `TransitionConditionDto { kind: 'sustained' | 'condition', condition_id, met, ticks?, progress? }`. Entries are ordered by ascending transition handle (the registry's `handlesOf` order). The residence summary gains `transition_eligibility` (optional).

### D2 — Evaluation

For each transition whose source tier equals the residence's tier: the overall condition is evaluated with the injected placement/source evaluator (the app's `buildConditionEvaluator`), so query and timer semantics match the simulation. Sustained nodes are collected from the compiled tree in pre-order and read from `world.timers`. When the transition has no condition, `eligible` is true (subject only to the gate).

### D3 — Advancement gate

`advancement_enabled` comes from `bandState` (default true without a band). A transition listed in the tier's `decline_transitions` is never gated by it; every other transition is ineligible while the gate is false. This is the v1 reading of GDD-12.6's `enable_advancement`.

### D4 — Protocol

The DTOs are additive optional fields; the entity-detail codec passes the `residence` object through when present. No protocol version bump; the client reads the fields when available. No save or hash change.

## Clarifications recorded (no normative amendment)

- The checklist reports one entry per sustained node plus one overall condition entry; other leaf conditions are summarized by the overall entry (the client can show the timer progress that GDD-13.1 calls out).
