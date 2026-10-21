/**
 * Reservation-ledger queries (TDS-12.3). Quantity reservations count against
 * stored quantity; capacity reservations count against capacity.
 *
 * Source: TDS-12.3, INV-02, INV-03
 */
import type { Int } from '../fx/index.js';
import type { DefinitionHandle, EntityId, ReservationId } from '../ids/index.js';
import type { Reservation, World } from '../world/types.js';

/** Returns the reservation with `id`, or `null`. */
export function findReservation(world: World, id: ReservationId): Reservation | null {
  for (const reservation of world.ledger.reservations) {
    if (reservation.id === id) return reservation;
  }
  return null;
}

/** Sums active quantity reservations for an inventory and resource (INV-02). */
export function quantityReserved(
  world: World,
  inventory: EntityId,
  resource: DefinitionHandle,
): Int {
  let total = 0;
  for (const reservation of world.ledger.reservations) {
    if (
      reservation.capacity === false &&
      reservation.inventory === inventory &&
      reservation.resource === resource
    ) {
      total += reservation.quantity;
    }
  }
  return total;
}

/** Sums active capacity reservations for an inventory and resource (INV-03). */
export function capacityReserved(
  world: World,
  inventory: EntityId,
  resource: DefinitionHandle,
): Int {
  let total = 0;
  for (const reservation of world.ledger.reservations) {
    if (
      reservation.capacity === true &&
      reservation.inventory === inventory &&
      reservation.resource === resource
    ) {
      total += reservation.quantity;
    }
  }
  return total;
}

/** Sums active capacity reservations for an inventory across all resources. */
export function capacityReservedTotal(world: World, inventory: EntityId): Int {
  let total = 0;
  for (const reservation of world.ledger.reservations) {
    if (reservation.capacity === true && reservation.inventory === inventory) {
      total += reservation.quantity;
    }
  }
  return total;
}
