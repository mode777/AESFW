# Design

## Context

Owner accounts (`world.owners.accounts`), the `account` transaction op, and the `TxEnvironment.allowNegative` predicate already exist (1.7); the pipeline builds its transaction writer without an environment (`step.ts`), a seam the 1.7 design explicitly reserved for this change. Phase 26 applies only the first output as a capability provider with a hard-coded `1000` multiplier (1.11); `satisfaction_curve` is schema-parsed but dropped at instantiation. Curve compilation and evaluation live in `@aesfw/content` (`conditions/curves.ts`); `@aesfw/content` depends on `@aesfw/core`, never the reverse.

## Goals / Non-Goals

- Goals: income is fully determined by `(world, registry)`; no new hidden tick inputs; no save-format, protocol, or golden changes; content alone decides what may go negative.
- Non-Goals: expenses (4.2), deficit policy (4.3), projections (4.4/4.5), global-scoped account storage, multi-provider residences.

## Decisions

### D1 — `allowNegative` derives from the registry by point lookup

`step`/`runPhases`/`runSystem` construct `createTransactionWriter(world, journal, txEnvironmentFor(registry))`, where `txEnvironmentFor` returns `{ allowNegative: (resource) => resourceAllowsNegative(registry, resource) }` and `resourceAllowsNegative` reads `definitionDataOf('resource', handle)` raw data (`allow_negative === true`).

- Alternative considered: enumerating all balance resources into a set at startup — the `Registry` interface has no enumeration and adding one churns a core interface; the predicate needs only point lookups, which the placement module already treats as the precedent for content access (`sim/placement/definition.ts`).
- Alternative considered: a new `TickInput` field threaded from the app (like `conditionEvaluator`) — rejected: income must not depend on whether a host remembered to wire an evaluator; determinism by construction prefers `(world, registry)`-complete behavior.

### D2 — Curve evaluation moves to `@aesfw/core`, content delegates

`fx` gains a pure `evaluateCompiledCurve({ type, points, extrapolation }, input)` implementing TDS-14.4 semantics (floor interpolation via `fx.mulDiv`, clamp/linear/error extrapolation, `error` clamps at runtime). `@aesfw/content`'s `evaluateCurve` refactors to call it and keeps adding its `curve_extrapolation_error` diagnostics for its own callers. Phase 26 reads the raw curve definition via `definitionDataOf('curve', handle)` and evaluates it directly.

- Rationale: the alternative — a `TickInput.curveEvaluator` seam mirroring `conditionEvaluator` — would make income depend on host wiring (same objection as D1). Curve evaluation is pure fixed-point arithmetic, so it belongs beside `fx` (TDS-14.4 fixes the semantics; where the pure evaluator lives is not normative). No amendment to 05 is required; `definitionDataOf` absence or malformed data evaluates as the full rate (defensive, content validation already rejects malformed curves).
- The step/lookup/constant semantics and extrapolation behavior are moved verbatim; content unit tests must keep passing unchanged.

### D3 — Phase 26 structure

`applyPopulationOutputs(world, registry, tx, events)` iterates residences ascending, then outputs in resolved order:

- resource storage policy `recomputed` → capability output: only the **first** such output publishes the `capabilityProvider` (preserves the 1.11 one-provider-per-entity decision D4; the accumulator key `(residence, population_need, resource)` is per resource, so capability and income outputs of different resources never collide).
- resource storage policy `normal` → income: multiplier = `evaluateCompiledCurve(curve, z)` when `satisfactionCurve` is set, else `1000`; `fx.accumulate(count × rate, multiplier, carry)`; credit `tx.account({ owner, resource, delta: amount, reason: 'population_income' })`; emit `PopulationOutputProduced` with owner attribution when `amount ≠ 0`.

The credited owner is the owner of the residence's `location` entity; residences without a location, or with an ownerless location, or with population `0` produce nothing. The `Reason` union stays a free-form string (`'population_income'` is a new stable tag, not a `Purpose`). The accumulator purpose remains `population_need` (the 1.11 v1 interpretation — income and capability rates share the per-residence accumulator table; keys include the resource, so they do not collide).

Phase 26 descriptor: `reads: ['residence', 'populationGroup', 'satisfaction']`, `writes: ['capabilityProvider', 'accumulators', 'owners', 'ledger']` (tx-committed account entries mutate `owners`; `ledger` follows the phase-11/13 convention for tx-writing systems).

Satisfaction Z is read from the `satisfaction` component written by phase 21 in the same tick — a residence without one (phase 26 unit tests) uses `1000`.

### D4 — Instantiation resolves `satisfaction_curve`

`residenceFrom` (app) maps `satisfaction_curve` through `handle(registry, 'curve', …)` instead of hard-coding `null`. Unresolvable IDs already fail reference resolution with a diagnostic. Existing fixtures have no curves, so component encodings are unchanged — **not hash-changing**.

### D5 — Validation diagnostic

A cross-field check in the content pipeline (where resource definitions are normalized) reports `resource_allow_negative_scope` when `allow_negative: true` coexists with `storage.scope ∉ {owner, global}`. Code name follows the existing `<noun>_<problem>` diagnostic convention.

### D6 — Fixture `fixtures/content/demo-economy`

Theme-free package `demo.economy`: one owner-scoped currency (`allow_negative: true`), one capability, one need fed by a producer, one residence tier with capability + income outputs (income with a satisfaction curve), abstract-capacity location. L1 tests use the testkit `content()` builder for narrow cases; the fixture serves integration tests and is extended by 4.2/4.3/4.6 (SCN-04 golden builds on it). No existing fixture or golden changes.

## Risks / Trade-offs

- [Raw-data curve evaluation could diverge from content's compiled semantics] → content's `evaluateCurve` delegates to the same core function; content tests guard equality; only compilation stays content-side.
- [Income credited via `tx.account` can fail (`insufficient_balance` is impossible for balance resources, but overflow is not)] → the account op already returns overflow errors; phase 26 must handle a failed account result deterministically — treat `arithmetic_overflow` as an `InvariantViolation` (it is a defect, not an expected state; rates are content-validated integers).
- [Phase 26 write-set grows to `owners`] → write-set guard tests updated; INV-18 (encode/decode/hash round-trip) already covers accounts.
- [`satisfaction` read introduces phase-order coupling] → phase 21 runs before 26 canonically; `runPhases([26])` tests inject satisfaction directly; absence defaults to `1000`.

## Migration Plan

No save-format or protocol change. No golden changes (existing fixtures have no balance resources or curves). Additive core exports; content's public `evaluateCurve` signature is unchanged.

## Open Questions

None.
