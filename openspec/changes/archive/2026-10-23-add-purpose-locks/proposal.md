# Proposal

## Why

Roadmap 08, M7 item 7.4 (`add-purpose-locks`). Inventory access carries purposes and the transaction layer already evaluates purpose locks at reservation time (`purpose_locked`), but no command can set or clear a lock, and `withdraw`/`transfer` bypass the check — so the canonical pacing brake of GDD-8.5 (locking construction resources against `population_transition`) is unreachable and unenforced for direct accesses such as need delivery and `transport_load`. This change adds the `SetResourcePurposeLock` command and uniform lock enforcement, retiring the pacing-brake part of R-08 and reducing R-04 (economic-semantics mistakes).

## What Changes

- Phase 01 handles `SetResourcePurposeLock { inventory, resource, purpose, locked }` (TDS-16.2): it validates the inventory, resource, and purpose and that the commanding actor owns the inventory, then adds or removes the lock in the owning owner's `purposeLocks`. Applied/rejected outcomes use the existing outcome model; rejections report `unknown_inventory`, `unknown_resource`, `invalid_purpose`, or `not_owner`.
- `withdraw` and `transfer` transactions evaluate purpose locks like `reserve`: an access whose `(inventory, resource, purpose)` is locked fails with `purpose_locked`, so every purpose — `production_input`, `population_need`, `construction`, `population_transition`, `transport_load`, `exchange_sale`, `maintenance`, `establishment` — is filtered (GDD-8.5, TDS-12.3).
- The `shared_location` inventory-access policy accepts the access purpose and excludes inventories whose owner locked the `(resource, purpose)` pair, so need delivery no longer counts locked stock as available.
- Purpose locks stay authoritative owner state: encoded, decoded, hashed (already in the v1 codec), and now mutable only through the command.
- Theme-free unit coverage for the command's accept/reject paths, the transaction rejections, the policy filter, and ordering.

## Capabilities

### New Capabilities

- none

### Modified Capabilities

- `kernel/transactions`: lock evaluation in `withdraw` and `transfer`; the policy filter; the command's state change.

## Impact

- **Packages:** `@aesfw/core` (phase 01, tx builder, inventory-access policy, needs delivery), `@aesfw/app` (session command plumbing is generic; no new surface), `fixtures/` (theme-free coverage).
- **Tick phases:** phase 01 `applyCommands` (writes `owners`).
- **Store kinds:** `owners` (`purposeLocks`, already encoded and hashed — values become populated).
- **Commands/events:** command `SetResourcePurposeLock`; no new events. **Error codes:** `invalid_purpose` added to the command error registry; transaction error `purpose_locked` already exists. **Diagnostic codes:** none.
- **Protocol/save format:** no wire change beyond the command union (the codec already persists `purpose_locks`). **HASH-CHANGING:** no — no shipped fixture sets a lock, so existing goldens are unchanged.
- **Dependencies on archived changes:** 1.7 `add-inventory-transactions` (archived 2026-10-21) and 2.2 `add-session-and-command-gateway` (archived 2026-10-22).

## Out of Scope

- 7.3 `add-tier-transitions`: transition costs reserving under `population_transition` (they will fail closed under locks, which is the point of the brake).
- 9.2 `add-trade-execution`: exchange `buy`/`sell` actions carrying price limits (their `exchange_sale` accesses already obey the lock check).
- 12.5 `add-alternative-inventory-access-policies`: purpose-aware filtering for `connected_graph`/`explicit_logistics`.
