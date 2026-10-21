/**
 * Expired-reservation release (TDS-12.3). A pure helper; the construction-
 * lifecycle row (3.2) wires it into phase 30.
 *
 * Source: TDS-12.3
 */
import type { Tick } from '../ids/index.js';
import type { World } from '../world/types.js';

/** Removes reservations whose non-null expiry is at or below `atTick`. */
export function releaseExpiredReservations(world: World, atTick: Tick): number {
  const kept = world.ledger.reservations.filter(
    (reservation) => reservation.expiryTick === null || reservation.expiryTick > atTick,
  );
  const removed = world.ledger.reservations.length - kept.length;
  if (removed > 0) world.ledger = { reservations: kept };
  return removed;
}
