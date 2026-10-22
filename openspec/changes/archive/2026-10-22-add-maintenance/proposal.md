# Proposal

## Why

Roadmap 08, M4 item 4.2 (`add-maintenance`). With the balance currency in place (4.1), the expense side of GDD-20.2 is missing: entities cost nothing to keep, so idle chains cannot lose money and the loss spiral of GDD-3.7 cannot start. Maintenance is also the last input of the entity tuple "(input vector, output rate, footprint, capability demand, maintenance)" (GDD-4.9) and the mechanics behind R-08's planning question "why does this chain lose money". It retires the framework side of R-08 (planning currency) together with 4.5.

## What Changes

- Entity `maintenance` content component (CONT-6.8): `interval_ticks`, `inputs` (resource, quantity), `charge_policy`, `shortage_policy`, with schema and validation.
- Charge policies (GDD-20.1): `while_exists`, `while_enabled` (reference), `while_active`, `while_processing`. Charges happen in phase 26 on every interval boundary (`tick mod interval_ticks = 0`), via owner-account transactions with reason `maintenance`.
- Maintenance exclusion (INV-11): entities paused by the deficit policy pay no maintenance under every policy; the `deficitPaused` owner state is consulted now, ahead of 4.3 writing it.
- Shortage policies (GDD-20.1) when a charge cannot be paid in full: `deactivate_entity` (disable), `scale` (charge the affordable part), `accumulate_debt` (accrue arrears charged on the next interval), `ignore`, `owner_deficit_policy` (event-only stub until 4.3), `trigger_transition` (validation-rejected stub until 7.3).
- Entity ownership attribution: instantiation and placement write an `owner` component, so phase 26 and later economy systems resolve the charging owner without content access.
- Entity detail read model populates the existing `maintenance` field (PIC-10.1: amount per interval and charge policy).
- Events `MaintenanceCharged` and `MaintenanceShortage` (string-typed; no protocol change).
- The `demo-economy` fixture gains maintenance on its producer, so income minus expenses is observable end to end.

## Capabilities

### New Capabilities

### Modified Capabilities

- `sim/economy`: ADDED maintenance requirements — charge policies, intervals, shortage policies, INV-11 exclusion.
- `content/schemas`: ADDED requirement — the entity `maintenance` component schema and its validation rules.
- `sim/population`: MODIFIED — phase 26 now applies maintenance in addition to population outputs (the 1.11-era note "maintenance arrives with 4.2" is fulfilled).

## Impact

- **Packages:** `@aesfw/core` (`sim/economy/maintenance.ts`, phase 26 wiring, placement owner component), `@aesfw/content` (entity schema, validation diagnostics), `@aesfw/app` (maintenance instantiation, entity-detail read model), `@aesfw/testkit` (fixtures, invariant reuse), `fixtures/` (demo-economy extension).
- **Tick phases:** phase 26 `applyContinuousOutputsAndMaintenance` (02 §5.2) — reads add `maintenance`, `enabled`, `lifecycle`, `producer`, `owner`; writes add `maintenance` (arrears), `enabled` (deactivate_entity).
- **Store kinds:** `maintenance` (new usage of the registered kind), `owner` (new usage), `enabled`, `lifecycle`, `producer` (read-only).
- **Commands:** none. **Events:** `MaintenanceCharged`, `MaintenanceShortage`. **Error codes:** none new (`insufficient_balance` drives shortages). **Diagnostic codes:** `maintenance_while_processing_requires_producer`, `unsupported_shortage_policy` (temporary until 7.3).
- **Protocol/save format:** none — `maintenance` and `owner` are already registered component kinds that ride the existing codec; `EntityDetailDto.maintenance` already exists in the wire contract. **HASH-CHANGING:** the `owner` components added at instantiation change world encodings, so the `demo-basic-loop` golden (SCN-01) is regenerated; the tick semantics are untouched and the change is explained in design.md (06 §9.4).
- **Dependencies on archived changes:** 4.1 `add-balance-resources-and-income` (archived 2026-10-22), 3.2 `add-construction-lifecycle` (archived 2026-10-22), 2.11 `add-entity-definition-references` (archived 2026-10-22).

## Out of Scope

- 4.3 `add-owner-deficit-policy`: the phase-27 pause/resume engine that `owner_deficit_policy` delegation targets; in this change delegation only emits the shortage event.
- 7.3 `add-tier-transitions`: `trigger_transition` stays validation-rejected until transitions exist.
- 6.2 `add-transport-units-and-cargo`: transport-unit maintenance.
- 4.4 `add-owner-economy-read-model`: revenue/expense aggregation.
- Per-tick amortized maintenance display: the read model reports the per-interval amount.
