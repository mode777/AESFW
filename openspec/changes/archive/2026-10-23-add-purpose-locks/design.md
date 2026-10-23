# Design

## Context

Purpose locks already exist as authoritative owner state (`OwnerState.purposeLocks`, encoded/hashed in the v1 codec) and the tx `reserve` op rejects locked reservations with `purpose_locked` (TDS-12.3). The command union of TDS-16.2 names `SetResourcePurposeLock`, but phase 01 does not handle it, `withdraw`/`transfer` ignore locks, and the `shared_location` policy ignores the purpose its caller intends (its interface omits `purpose`).

## Goals / Non-Goals

- Goals: the command; uniform lock enforcement across `reserve`, `withdraw`, and `transfer`; purpose-aware access filtering for the `shared_location` policy; ordered, persisted locks.
- Non-Goals: partial-quantity locks (GDD-8.5 locks are absolute per `(inventory, resource, purpose)`); the M12 access policies; transition-cost semantics (7.3); exchange semantics (M9).

## Decisions

### D1 — Command handling (phase 01)

`SetResourcePurposeLock` follows the `ActivateLocation` ownership pattern: resolve the `inventory` component, reject `unknown_inventory`; validate the resource via `registry.stringIdOf('resource', …)` (`unknown_resource`) and the purpose against the `Purpose` union (`invalid_purpose`); reject `not_owner` when `inventory.owner !== actor`. `locked: true` appends the lock when absent; `locked: false` filters it out; both keep the list sorted by `(inventory, resource, purpose)` (design D4 of 1.7's owner-state ordering). The command declares no store writes outside `owners`.

### D2 — Lock checks in withdraw and transfer

The `withdraw` op rejects with `purpose_locked` (same arguments as `reserve`) after the inventory lookup and before the availability computation. The `transfer` op checks the `from` side only — the access is the withdrawal; the deposit has no purpose. `commit` of an existing reservation is not re-checked: the lock was evaluated when the reservation was made (TDS-12.3). Effects: need delivery (`population_need`), transport load/unload (`transport_load`), maintenance (`maintenance`), deficit and production paths all fail closed under locks, which is the pacing-brake semantics.

### D3 — Purpose-aware access filtering

`InventoryAccessPolicy.accessibleInventories` gains a required `purpose` parameter; the `shared_location` implementation drops inventories whose owner has the `(resource, purpose)` lock. Callers: need delivery passes `population_need` (deliver.ts); no other framework callers exist in v1. Transport load iterates inventories through its own handling path and is filtered by the `withdraw` rejection, not the policy.

### D4 — Ordering and persistence

`purposeLocks` are stored sorted by `(inventory, resource, purpose)`; set/clear re-sorts. The v1 codec already round-trips the list and the hash covers it; a save-continue test asserts equality with an uninterrupted run. **No golden changes**: no shipped fixture sets a lock.

## Clarifications recorded (no normative amendment)

- GDD-8.5 says an owner locks "a resource in an inventory"; this change records that the lock is enforced against every accessor of that inventory for the locked purpose, and that the lock lives on the inventory's owner (matching TDS-8.5's `owners` placement).

## Risks / Open Questions

- Existing production reserve paths already honour locks; adding `withdraw`/`transfer` checks can only turn previously-silent overdrafts into rejections for content that uses locks, and no shipped content does.
