# Design

## Context

Phase 26 currently applies population outputs only (4.1). The `maintenance` and `owner` component kinds are registered but unused; the entity components schema intentionally omits `maintenance` (its header defers to this row). `Purpose` already includes `'maintenance'`, and the `EntityDetailDto.maintenance` wire field exists unpopulated (PIC-10.1). Placed entities receive no functional components at placement time — construction completion instantiates them — so ownership attribution needs a home in both instantiation paths.

## Goals / Non-Goals

- Goals: deterministic interval billing; policies as pure data-driven branches; INV-11 exclusion ready before phase 27 writes `deficitPaused`; every new observable surfaced through existing contract fields.
- Non-Goals: the deficit engine itself (4.3), transport maintenance (6.2), transitions (7.3), expense aggregation (4.4), per-tick amortization.

## Decisions

### D1 — Interval boundaries by modulo, not per-entity timers

Phase 26 charges entity E at tick T when `T mod intervalTicks = 0`. All entities with equal intervals bill simultaneously; no timer state is saved.

- Alternative: per-entity `nextChargeTick` counters — authoritative state, save-format surface, and hash churn for zero expressive gain; GDD-20.1 only fixes "deterministic periodic transactions".

### D2 — Owner attribution via an `owner` component

`instantiateContentEntities` writes `{ owner }` (the default location's owner) on every entity it creates; placement apply writes the placement location's owner. Phase 26 (and later 4.3/4.4) reads the component; entities without one are skipped by maintenance.

- Alternative: derive owner per component kind (residence → location, producer → input inventory's owner, source → location) — no uniform answer for maintenance-only archetypes like connectors, and inventories can change. The component is written once at creation and never mutated, so it cannot drift.
- The component rides the existing codec; worlds built before this change (no `owner` components) encode identically — **not hash-changing**.

### D3 — Maintenance module and phase composition

New `sim/economy/maintenance.ts` with `applyMaintenance(world, registry, tx, events)` called by phase 26 after `applyPopulationOutputs`. Ordering inside the tick: income first, then maintenance — deterministic and matches "Income, maintenance" in TDS-11.1's phase 26 row. Writes per policy: `deactivate_entity` writes `enabled`; `accumulate_debt` writes `maintenance` (arrears); all charge paths write `owners`/`ledger` through the transaction writer.

### D4 — Shortage semantics

A shortage is a failed or partially unpayable charge. Evaluation is per input line, ascending: the account op for a line is attempted for the full due (base + arrears); on `insufficient_balance` the policy applies to that line. `scale` re-attempts with `delta = min(due, balance)` when balance > 0. `accumulate_debt` adds the full due to the line's arrears; a later fully-paid interval clears the line's arrears (charge due = base + arrears, then reset to 0). `deactivate_entity` writes `enabled: false` and emits `MaintenanceShortage`. `owner_deficit_policy` emits `MaintenanceShortage` with `delegated: true` — the 4.3 stub. `trigger_transition` is rejected at validation until 7.3 owns transitions; the `unsupported_shortage_policy` diagnostic is removed then.

- v1 interpretation (recorded like 1.11 D3): "accumulate debt resource" accrues arrears on the component rather than minting a separate debt resource; no content field names a debt resource in 03 §6.8.

### D5 — Charging states

- `while_exists`: lifecycle ∈ {active, disabled, blocked}, or no lifecycle component (content-instantiated entities never planned).
- `while_enabled`: `enabled` component true (absent = true) and lifecycle ≠ disabled; utilization and blocked state ignored.
- `while_active`: additionally producer.state ≠ blocked (entities without a producer are never blocked).
- `while_processing`: producer.state = processing; validation requires a producer.
- Under all policies: owner `deficitPaused` containing the entity excludes the charge (INV-11), checked before the policy.

### D6 — Read model

`EntityDetailDto.maintenance = { amount: Σ input quantities, policy: chargePolicy }` — per-interval amount as PIC-10.1's entity tuple describes maintenance as a per-chain cost figure. No new DTO fields; `owner_id` stays as is.

## Risks / Trade-offs

- [Modulo billing changes relative cash-flow timing vs per-entity timers] → deterministic and content-controlled via `interval_ticks`; content chooses staggering.
- [`owner` component adds a store write to two creation paths] → covered by instantiation tests; placement test extended.
- [Arrears on a component are authoritative state] → `maintenance` rides the codec; INV-18 round-trips it; determinism harnesses cover accrual across save-continue.

## Migration Plan

**Golden-hash change (06 §9.4).** The `owner` attribution components add a component entry per instantiated entity, so `demo-basic-loop` (SCN-01) world encodings change at every tick. The golden is regenerated in this change; the tick semantics of the basic loop are untouched (no maintenance content, empty `deficitPaused`), and the pre-change and post-change worlds are behaviorally identical apart from the added components. The proposal's "not hash-changing" claim was written before D2 landed the `owner` component; this section is the controlling record. `demo-economy` has no committed golden.

No save-format or protocol change (the `owner` kind rides the existing component codec).

## Open Questions

None.
