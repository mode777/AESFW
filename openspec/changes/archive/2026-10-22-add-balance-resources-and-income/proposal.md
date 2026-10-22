# Proposal

## Why

Roadmap 08, M4 item 4.1 (`add-balance-resources-and-income`). M4 introduces the balance currency — the fourth scarce-resource currency of GDD-2 — and retires the remainder of R-08 (planning currency) together with the later M4 rows. Today the simulation has no owner-scoped economy: owner accounts exist as a transaction op but nothing credits them, `allow_negative` is schema-only with no runtime realization, and population outputs produce capabilities only (roadmap 1.11 deferred income to this row). The balance resource is the foundation for maintenance (4.2), the deficit loss spiral (4.3, 4.6), the economy read model (4.4), and the planning metrics (4.5).

## What Changes

- Runtime realization of owner-scoped balance resources (GDD-7.5): a resource with `storage.scope: owner` and `allow_negative: true` is held in the owning owner's `accounts` table; account deltas for non-balance resources still reject a negative result (`insufficient_balance`), while balance resources may go below zero.
- The tick pipeline supplies a content-derived transaction environment: `step`/`runPhases`/`runSystem` build the `allowNegative` predicate from the registry (TDS-12), closing the seam reserved by `add-inventory-transactions`.
- Population income (GDD-11.3, GDD-20.2, phase 26): residence outputs whose resource is a normal-storage resource credit the owner account of the residence's location owner, scaled by the output's `satisfaction_curve` evaluated at the residence's satisfaction Z (default full rate when no curve is configured). Rate accumulators carry fractional income per residence.
- Phase 26 processes **all** resolved outputs: capability outputs publish the `capabilityProvider` (first capability output, per the one-provider-per-entity rule of 1.11), resource outputs credit income. The `satisfaction_curve` reference is resolved at instantiation (today it is dropped).
- Core-side curve evaluation (TDS-14.4): a pure fixed-point curve evaluator over compiled curve points moves into `@aesfw/core`'s `fx` so phase 26 can evaluate curves without importing `@aesfw/content`; `@aesfw/content` delegates its evaluator to it.
- Content validation (CONT-6.3): a diagnostic rejects `allow_negative: true` on resources whose storage scope is neither `owner` nor `global`.
- Invariant INV-01 extension (06 §8): owner account entries below zero are findings unless the resource declares `allow_negative`; inventory quantities remain strictly non-negative.
- Theme-free fixture `fixtures/content/demo-economy` (balance resource, income tier, residence) for this and later M4 rows.

## Capabilities

### New Capabilities

- `sim/economy`: the owner balance model — balance resources with `allow_negative`, population income with satisfaction curves, and the phase-26 continuous-output rules. Later M4 rows extend it with maintenance (4.2) and the deficit policy (4.3).

### Modified Capabilities

- `content/schemas`: new validation requirement — `allow_negative` is only legal on owner- or global-scoped resources (CONT-6.3).
- `sim/population`: phase 26 requirement changes — all outputs are applied (capability provider + income), and income is scaled by the satisfaction curve (GDD-11.3); the 1.11 "outputs[0], multiplier 1000" scope is superseded.
- `testkit/harness`: INV-01 gains the owner-account negative-balance rule (06 §8).
- `foundation/fixed-point`: the pure curve evaluator relocates to `fx` (TDS-14.4); no behavior change.

## Impact

- **Packages:** `@aesfw/core` (phase 26, tx environment, `fx` curve evaluation), `@aesfw/content` (validation diagnostic; evaluator delegation), `@aesfw/app` (instantiate `satisfaction_curve`), `@aesfw/testkit` (INV-01, fixtures), `fixtures/` (new `demo-economy`).
- **Tick phases:** phase 26 `applyContinuousOutputsAndMaintenance` (02 §5.2) — reads add `satisfaction`, writes add `owners` and `ledger`.
- **Store kinds:** `owners` (account entries), `accumulators` (income carry), `capabilityProvider` (unchanged shape), `satisfaction` (read-only).
- **Commands:** none. **Events:** `PopulationOutputProduced` gains owner attribution for income credits. **Error codes:** none new (`insufficient_balance` unchanged). **Diagnostic codes:** one new content diagnostic for the `allow_negative` scope rule.
- **Protocol/save format:** none — owner accounts are already encoded and hashed; no wire DTO changes. Not hash-changing for existing fixtures (they have no owner-scoped outputs and no curves; the `demo-basic-loop` golden is unaffected).
- **Dependencies on archived changes:** 1.11 `add-residences-and-population-outputs` (archived 2026-10-21), 1.7 `add-inventory-transactions` (archived 2026-10-21), 1.6 `add-condition-and-curve-compiler` (archived 2026-10-21).

## Out of Scope

- 4.2 `add-maintenance`: charge policies, intervals, shortage policies (expenses side of GDD-20.2).
- 4.3 `add-owner-deficit-policy`: phase 27 pause/resume, `paused_by_deficit`, `ResumeDeficitPausedEntities`.
- 4.4 `add-owner-economy-read-model`: revenue/expense read model (PIC-10.6); balance stays unexposed to clients in this change.
- 4.5 `add-planning-metrics-read-model`: supported population (GDD-3.8).
- Global-scoped balance storage: CONT-6.3 permits `allow_negative` on global resources; a global account locus stays unimplemented until a row needs it.
- Location- or global-scoped *resource* outputs from residences: only owner-scoped income credits accounts in this change.
