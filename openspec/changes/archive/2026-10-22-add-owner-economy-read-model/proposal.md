# Proposal

## Why

Roadmap 08, M4 item 4.4 (`add-owner-economy-read-model`). The deficit policy (4.3) and maintenance (4.2) now decide an owner's finances, but no client-visible surface explains them: `OwnerBalanceDto` exists in the snapshot protocol yet is never populated, the projection delta carries no owner changes at all (so balances would freeze after the first snapshot), and PIC-10.6's by-source breakdown and idle-but-paying entities have no data path. This is the read-model leg of R-08's "why does this chain lose money" question that 4.7 renders.

## What Changes

- The per-owner snapshot entry populates `balance` (`OwnerBalanceDto`): revenue, expenses, and net as per-tick rates, and `deficit_paused_entities` in pause order (PIC-9.1, PIC-10.6).
- `OwnerBalanceDto` gains optional additive fields: `revenue_by_source` (keyed `tier.<id>`), `expenses_by_source` (keyed `entity.<id>`), and `idle_paying_entities` (PIC-10.6).
- The projection delta gains an optional `owner_updates` list carrying the full changed owner entries, and `diffProjection` emits it when an owner's entry changes — without it, balances would never reach the client after the first snapshot.
- Protocol codecs decode the new optional fields.

## Capabilities

### New Capabilities

### Modified Capabilities

- `app/projections`: MODIFIED full-projection requirement (owner balance populated) and ADDED owner-update delta requirement.
- `app/protocol`: ADDED requirement — the additive `OwnerBalanceDto` fields and delta `owner_updates` with codec support.

## Impact

- **Packages:** `@aesfw/protocol` (DTO fields, delta codec), `@aesfw/app` (`ownerDto` balance construction, `diffProjection` owner updates).
- **Tick phases:** none — read models only. **Store kinds:** reads `maintenance`, `owner`, `residence`, `populationGroup`, `satisfaction`, `producer`, `enabled`, `lifecycle`.
- **Commands/events/error codes/diagnostics:** none.
- **Protocol:** additive optional fields only; v1 decoders accept snapshots and deltas without them (PIC-3 evolution rule). **Save format:** untouched. **Not hash-changing** (projections are not hashed).
- **Dependencies on archived changes:** 4.3 `add-owner-deficit-policy` (archived 2026-10-22), 4.2 `add-maintenance` (archived 2026-10-22), 2.3 `add-projections-and-deltas` (archived 2026-10-22).

## Out of Scope

- 4.7 `add-client-economy-and-planning`: rendering the balance, trend sparkline, and views in the reference client.
- 4.5 `add-planning-metrics-read-model`: supported population and chain metrics.
- M9 exchange sales/purchases as revenue/expense sources (sources appear once exchanges exist; keys reserved by the by-source scheme).
- 6.2 transport-unit maintenance as an expense source.
- Balance trend history: the client derives trends from successive read models (REF-12.4).
