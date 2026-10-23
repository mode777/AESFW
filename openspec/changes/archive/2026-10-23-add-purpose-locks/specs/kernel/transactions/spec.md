# Spec Delta

## Purpose

Purpose locks (GDD-8.5) let an owner make a resource in an inventory unavailable to selected access purposes while it stays available to every other purpose; the `SetResourcePurposeLock` command sets and clears them, and every inventory access honours them.

## ADDED Requirements

### Requirement: Setting and clearing purpose locks
The `SetResourcePurposeLock` command SHALL add `(inventory, resource, purpose)` to the owning owner's `purposeLocks` when `locked` is `true` and remove it when `false`, ignoring a repeated set or clear, and SHALL apply only when the inventory exists, the resource and purpose are known, and the commanding actor owns the inventory; otherwise it SHALL be rejected with `unknown_inventory`, `unknown_resource`, `invalid_purpose`, or `not_owner`.

Source: GDD-8.5, TDS-16.2, TDS-12.3

#### Scenario: A lock is set and reported
- **WHEN** the owner of inventory `2` submits `SetResourcePurposeLock { inventory: 2, resource: test.resource.bricks, purpose: population_transition, locked: true }`
- **THEN** the command is applied and the owner's `purposeLocks` contain `(2, test.resource.bricks, population_transition)`

#### Scenario: Clearing an absent lock still applies
- **WHEN** the owner submits `SetResourcePurposeLock { ..., locked: false }` for a pair that is not locked
- **THEN** the command is applied and `purposeLocks` are unchanged

#### Scenario: A non-owner is rejected
- **WHEN** another owner submits `SetResourcePurposeLock { inventory: 2, ..., locked: true }`
- **THEN** the command is rejected with `not_owner` and no lock changes

### Requirement: Locks gate every purposeful access
The `withdraw` and `transfer` transactions SHALL fail with `purpose_locked` when the accessed `(inventory, resource, purpose)` is locked, applying to every purpose including `transport_load`, and SHALL succeed for any other purpose on the same stock. `reserve` keeps its existing lock check.

Source: GDD-8.5, TDS-12.3

#### Scenario: A locked purpose is rejected and another purpose withdraws
- **WHEN** `(2, test.resource.bricks, population_transition)` is locked, the inventory stores `5000`, a `transport_load` withdraw of `2000` is attempted, and a `population_need` withdraw of `2000` is attempted
- **THEN** the `transport_load` withdraw fails with `purpose_locked` and the `population_need` withdraw succeeds

#### Scenario: Unlocking restores access
- **WHEN** the lock above is cleared and the same `transport_load` withdraw is retried
- **THEN** the withdraw succeeds

### Requirement: Access filtering excludes locked inventories
The `shared_location` inventory-access policy SHALL accept the access purpose and SHALL exclude inventories whose owner locked the `(resource, purpose)` pair, so an excluded inventory contributes no available stock.

Source: GDD-8.5, ARCH-12, TDS-16.2

#### Scenario: A locked inventory contributes no stock
- **WHEN** two inventories at a location hold `3000` each of a resource, one locked for `population_need`, and a residence demands `4000`
- **THEN** the policy returns only the unlocked inventory and the residence demands against `3000` available

### Requirement: Lock state is authoritative and ordered
Purpose locks SHALL be saved and hashed with the owning owner, and `purposeLocks` SHALL stay ordered by `(inventory, resource, purpose)`.

Source: GDD-8.5, TDS-8.5, TDS-12.3

#### Scenario: Locks persist and stay ordered
- **WHEN** an owner sets locks for `(3, r_b)`, `(2, r_a)`, `(2, r_c)` and the world is saved, loaded, and stepped
- **THEN** the reloaded locks read `(2, r_a)`, `(2, r_c)`, `(3, r_b)` in that order and the save-continue hash equals the uninterrupted hash
