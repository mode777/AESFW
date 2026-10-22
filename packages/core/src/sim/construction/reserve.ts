/**
 * Atomic construction-cost reservation (GDD-18.1, ARCH-6.2, TDS-12.2). The full
 * cost list is reserved as one all-or-nothing composite with purpose
 * `construction`; the created reservations are returned in ascending ID order,
 * parallel to the plan's cost list.
 *
 * Source: GDD-18.1, GDD-8.3, ARCH-6.2, TDS-12.2
 */
import type { EntityId, ReservationId } from '../../ids/index.js';
import { err, ok } from '../../result.js';
import type { Result } from '../../result.js';
import { findReservation } from '../../tx/ledger.js';
import type { TransactionWriter, TxError } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import type { ConstructionPlan } from './types.js';

/** Commits every reservation in full as one atomic composite. */
export function commitReservations(
  world: World,
  tx: TransactionWriter,
  reservations: readonly ReservationId[],
): void {
  if (reservations.length === 0) return;
  tx.atomic((builder) => {
    for (const id of reservations) {
      const reservation = findReservation(world, id);
      if (reservation !== null && reservation.quantity > 0)
        builder.commit(id, reservation.quantity);
    }
  });
}

/** Releases every still-active reservation as one atomic composite. */
export function releaseReservations(
  world: World,
  tx: TransactionWriter,
  reservations: readonly ReservationId[],
): void {
  if (reservations.length === 0) return;
  tx.atomic((builder) => {
    for (const id of reservations) {
      if (findReservation(world, id) !== null) builder.release(id);
    }
  });
}

const missingInventory = (): TxError => ({
  code: 'unknown_inventory',
  severity: 'error',
  package: null,
  file: null,
  path: null,
  definition: null,
  args: {},
});

/**
 * Reserves every line of `plan.costs` from `plan.inventory` for `entity`
 * (GDD-18.1). Returns the created reservation IDs in ascending order, or the
 * transaction error when any line fails.
 *
 * Source: GDD-18.1, ARCH-6.2, TDS-12.2
 */
export function reserveConstructionCosts(
  world: World,
  tx: TransactionWriter,
  entity: EntityId,
  plan: ConstructionPlan,
): Result<readonly ReservationId[], TxError> {
  if (plan.costs.length === 0) return ok([]);
  if (plan.inventory === null) return err(missingInventory());
  const inventory = plan.inventory;
  const firstNew = world.nextReservationId;
  const result = tx.atomic((builder) => {
    for (const cost of plan.costs) {
      builder.reserve({
        inventory,
        resource: cost.resource,
        quantity: cost.quantity,
        purpose: 'construction',
        holder: entity,
      });
    }
  });
  if (!result.ok) return err(result.error);
  const created = world.ledger.reservations
    .filter((reservation) => reservation.id >= firstNew)
    .sort((a, b) => a.id - b.id)
    .map((reservation) => reservation.id);
  return ok(created);
}
