# Spec Delta

## Purpose

The transaction engine: the inventory runtime shape, the reservation ledger with quantity and capacity reservations, the transaction union of TDS-12.1, and the atomic builder that validates and applies every authoritative quantity mutation, so the whole simulation mutates quantities through one deterministic, all-or-nothing path (ARCH-6, TDS-12).

## ADDED Requirements

### Requirement: Inventory state
An inventory SHALL carry an owning owner, an access-policy id, a revision counter, resource entries ordered by ascending resource handle, capacity rules (a total cap, a per-resource cap, or both), and acceptance rules. When the acceptance list is non-empty, a resource not listed SHALL be rejected on entry into that inventory.

Source: GDD-8.1, GDD-8.2, TDS-8.3

#### Scenario: Inventory entries are read by resource handle
- **WHEN** an inventory holds `2000` of resource handle `0` and `500` of resource handle `1`
- **THEN** reading the quantity of handle `0` returns `2000`, of handle `1` returns `500`, and of an absent handle returns `0`

### Requirement: Quantity reservation
`reserve` SHALL create a quantity reservation with a fresh reservation ID, the inventory, resource, quantity, purpose, holder, and expiry, and SHALL append it to the ledger. A rejected reservation SHALL leave the ledger unchanged.

Source: GDD-8.3, ARCH-12, TDS-12.1, TDS-12.3

#### Scenario: A reservation within stored quantity succeeds
- **WHEN** an inventory stores `1000` of a resource and `reserve` is called for `300`
- **THEN** the result is `ok` with a reservation of quantity `300`, and the ledger holds it

#### Scenario: A reservation beyond stored quantity is rejected
- **WHEN** an inventory stores `1000` and two reservations of `600` and `500` are requested
- **THEN** the second returns `err` with `insufficient_quantity` and the ledger holds only the first

### Requirement: Quantity reservation validation
`reserve` SHALL reject a non-positive quantity with `invalid_quantity`, an unknown inventory with `unknown_inventory`, a matching purpose lock with `purpose_locked`, and a quantity that would make active quantity reservations exceed stored quantity with `insufficient_quantity` (INV-02).

Source: GDD-8.3, ARCH-12, TDS-12.3

#### Scenario: A non-positive reservation is rejected
- **WHEN** `reserve` is called with quantity `0`
- **THEN** the result is `err` with `invalid_quantity`

#### Scenario: A reservation against an unknown inventory is rejected
- **WHEN** `reserve` names an entity that is not an inventory
- **THEN** the result is `err` with `unknown_inventory`

#### Scenario: A purpose-locked reservation is rejected
- **WHEN** the owner has locked the resource against `production_input` and `reserve` requests that purpose
- **THEN** the result is `err` with `purpose_locked`

#### Scenario: A locked resource is available to another purpose
- **WHEN** the owner has locked the resource against `production_input` and `reserve` requests `population_need`
- **THEN** the result is `ok`

### Requirement: Output-capacity reservation
`reserveCapacity` SHALL create a capacity reservation that is counted against the inventory's capacity rules but not against stored quantity. It SHALL be rejected with `insufficient_capacity` when stored quantity plus all capacity reservations would exceed the total cap, the per-resource cap, or both (INV-03). It SHALL accept the same rejection codes as quantity reservation for quantity, inventory, and purpose.

Source: GDD-8.4, TDS-12.1, TDS-12.3

#### Scenario: Capacity reservation within the per-resource cap succeeds
- **WHEN** an inventory with a per-resource cap of `500` stores `400` of a resource and `reserveCapacity` is called for `100`
- **THEN** the result is `ok` and the stored quantity is still `400`

#### Scenario: Capacity reservation beyond the cap is rejected
- **WHEN** an inventory with a per-resource cap of `500` stores `400` and `reserveCapacity` is called for `101`
- **THEN** the result is `err` with `insufficient_capacity`

#### Scenario: Both capacity rules are enforced
- **WHEN** an inventory has a total cap of `500` and a per-resource cap of `400`, stores `300` of resource A, and `reserveCapacity` of `150` for resource B is requested
- **THEN** the total would be `450` but the per-resource cap is not involved, so the result is `ok`; a further `60` for resource B returns `err` with `insufficient_capacity`

### Requirement: Reservation release and expiry
`release` SHALL remove a quantity or capacity reservation and restore its availability; releasing an unknown reservation SHALL return `err` with `unknown_reservation`. A pure `releaseExpiredReservations(world, tick)` SHALL remove every reservation whose expiry is non-null and at or below `tick` and leave all others.

Source: GDD-8.3, TDS-12.3

#### Scenario: Release restores availability
- **WHEN** an inventory stores `1000`, `300` is reserved, and the reservation is released
- **THEN** the ledger no longer holds it and a new reservation of `1000` succeeds

#### Scenario: Releasing an unknown reservation is rejected
- **WHEN** `release` names a reservation ID that is not in the ledger
- **THEN** the result is `err` with `unknown_reservation`

#### Scenario: Expired reservations are released
- **WHEN** the ledger holds a reservation with expiry `10` and one with expiry `20`, and `releaseExpiredReservations` runs at tick `15`
- **THEN** only the reservation with expiry `10` is removed

### Requirement: Reservation commit
`commit` SHALL reduce the stored quantity and the reservation quantity by the committed amount, and SHALL remove the reservation when the remaining quantity is `0`. A rejected commit SHALL leave state unchanged.

Source: GDD-8.3, TDS-12.1

#### Scenario: A partial commit reduces stored and reserved quantity
- **WHEN** an inventory stores `1000`, `500` is reserved, and `200` is committed
- **THEN** the stored quantity is `800` and the reservation quantity is `300`

#### Scenario: A full commit removes the reservation
- **WHEN** an inventory stores `1000`, `500` is reserved, and `500` is committed
- **THEN** the stored quantity is `500` and the ledger holds no reservation

### Requirement: Reservation commit validation
`commit` SHALL reject an unknown reservation with `unknown_reservation`, a capacity reservation with `reservation_mismatch`, a non-positive amount with `invalid_quantity`, and an amount above the reserved quantity with `quantity_exceeds_reservation`.

Source: GDD-8.3, TDS-12.1

#### Scenario: Committing beyond the reservation is rejected
- **WHEN** `500` is reserved and `501` is committed
- **THEN** the result is `err` with `quantity_exceeds_reservation` and neither stored nor reserved quantity changes

#### Scenario: Committing a capacity reservation is rejected
- **WHEN** `commit` names a capacity reservation
- **THEN** the result is `err` with `reservation_mismatch`

### Requirement: Deposit
`deposit` SHALL increase the stored quantity of a resource in an inventory, subject to acceptance and capacity. It SHALL be rejected with `invalid_quantity` for a non-positive amount, `unknown_inventory` for an unknown inventory, `not_acceptable` when the inventory does not accept the resource, and `insufficient_capacity` when stored quantity plus capacity reservations plus the deposit would exceed a cap (INV-01, INV-03).

Source: GDD-8.1, GDD-8.4, TDS-12.1

#### Scenario: A deposit within capacity succeeds
- **WHEN** an inventory with a total cap of `1000` stores `0` and `200` is deposited
- **THEN** the stored quantity is `200`

#### Scenario: A deposit beyond capacity is rejected
- **WHEN** an inventory with a total cap of `1000` stores `900` and `200` is deposited
- **THEN** the result is `err` with `insufficient_capacity` and the stored quantity stays `900`

#### Scenario: A deposit of an unaccepted resource is rejected
- **WHEN** an inventory accepts only resource handle `0` and handle `1` is deposited
- **THEN** the result is `err` with `not_acceptable`

#### Scenario: A deposit into an unknown inventory is rejected
- **WHEN** `deposit` names an entity that is not an inventory
- **THEN** the result is `err` with `unknown_inventory`

### Requirement: Withdrawal
`withdraw` SHALL decrease the stored quantity of a resource in an inventory without consuming a reservation, and SHALL be rejected with `invalid_quantity` for a non-positive amount and `insufficient_quantity` when the stored quantity minus active quantity reservations would fall below the withdrawn amount. A withdrawal SHALL never reduce the stored quantity below the active reservations (INV-01, INV-02).

Source: GDD-8.3, TDS-12.1

#### Scenario: A withdrawal from unreserved quantity succeeds
- **WHEN** an inventory stores `500` with `200` reserved and `300` is withdrawn
- **THEN** the stored quantity is `200`

#### Scenario: A withdrawal into reserved quantity is rejected
- **WHEN** an inventory stores `500` with `200` reserved and `400` is withdrawn
- **THEN** the result is `err` with `insufficient_quantity` and the stored quantity stays `500`

#### Scenario: A non-positive withdrawal is rejected
- **WHEN** `withdraw` is called with quantity `0`
- **THEN** the result is `err` with `invalid_quantity`

### Requirement: Transfer
`transfer` SHALL decrease the stored quantity of a resource in one inventory and increase it in another, subject to the source's unreserved quantity, the destination's acceptance, and the destination's capacity. It SHALL be rejected with `not_acceptable`, `insufficient_capacity`, or `insufficient_quantity` as those rules apply, and SHALL net to zero across the two inventories (INV-04).

Source: ARCH-6.1, TDS-12.1

#### Scenario: A transfer moves quantity between inventories
- **WHEN** inventory A stores `1000` and inventory B accepts the resource, and `300` is transferred from A to B
- **THEN** A stores `700` and B stores `300`

#### Scenario: A transfer into a non-accepting inventory is rejected
- **WHEN** the destination does not accept the resource
- **THEN** the result is `err` with `not_acceptable` and neither inventory changes

#### Scenario: A transfer beyond the source's unreserved quantity is rejected
- **WHEN** the source stores `500` with `200` reserved and `400` is transferred
- **THEN** the result is `err` with `insufficient_quantity`

### Requirement: Owner account
`account` SHALL apply a signed delta to an owner's account for a resource and SHALL create the account entry when absent. A resulting negative balance SHALL be rejected with `insufficient_balance` unless the transaction environment allows negative balances for that resource; an unknown owner SHALL be rejected with `unknown_owner`.

Source: GDD-7.5, ARCH-6.3, TDS-12.1

#### Scenario: A positive delta creates the account
- **WHEN** owner `0` has no account and a delta of `100` is applied
- **THEN** the account for the resource is `100`

#### Scenario: A negative delta within the balance succeeds
- **WHEN** an owner's account is `100` and a delta of `-50` is applied
- **THEN** the account is `50`

#### Scenario: A negative balance is rejected by default
- **WHEN** an owner's account is `100` and a delta of `-200` is applied
- **THEN** the result is `err` with `insufficient_balance`

#### Scenario: An unknown owner is rejected
- **WHEN** `account` names an owner handle that is not in the owners table
- **THEN** the result is `err` with `unknown_owner`

### Requirement: Atomic composites are all-or-nothing
`atomic(build)` SHALL stage the operations passed to the builder, validate every staged operation against the current state, and apply all of them only when every one succeeds. When any staged operation fails, no staged operation SHALL be applied, the ledger and quantities SHALL be unchanged, and the result SHALL be `err` with the failing operation's code (ARCH-6.2, INV-15). The `seq` of applied transactions SHALL increase monotonically within the tick.

Source: ARCH-6.2, TDS-12.2, INV-15

#### Scenario: A failing composite applies nothing
- **WHEN** a composite stages a deposit of `200` and a withdrawal of `500` from an inventory that stores `0`
- **THEN** the result is `err` with `insufficient_quantity` and the stored quantity is still `0`

#### Scenario: A valid composite applies every operation
- **WHEN** a composite stages a reserve of `300`, a commit of `100`, and a deposit of `200`
- **THEN** the result is `ok` and all three effects are present

### Requirement: Tick journal
When `TickInput.options.journal` is true, the transaction writer SHALL append every applied transaction, in application order, to the tick journal, and `TickOutput.journal` SHALL expose them; when journaling is false the journal SHALL be `null`. Enabling journaling SHALL NOT change authoritative state.

Source: TDS-12.4, TDS-10.1

#### Scenario: Applied transactions are journaled in order
- **WHEN** a system applies a reserve and then a commit during a tick with `journal: true`
- **THEN** `TickOutput.journal` holds a `reserve` then a `commit` with increasing `seq`

#### Scenario: Journaling is opt-in
- **WHEN** the same tick runs with `journal: false`
- **THEN** `TickOutput.journal` is `null` and the resulting state hash equals the journaled run
