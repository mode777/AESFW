/**
 * Production preconditions (phase 07, GDD-10.3). Static block reasons are
 * rebuilt every tick; a blocked producer is excluded from phases 11–13.
 *
 * Source: GDD-10.3, GDD-10.2
 */
import type { EntityId } from '../../ids/index.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { locationOf } from '../location.js';
import { isProducer, recipeOf } from './plan.js';
import type { BlockReason, Producer } from './types.js';

const isDisabled = (world: World, entity: EntityId): boolean => {
  const value = world.stores.get('enabled').get(entity) as
    { readonly enabled?: boolean } | null | undefined;
  return value != null && value.enabled === false;
};

const isDeficitPaused = (world: World, entity: EntityId): boolean =>
  world.owners.owners.some((owner) => owner.deficitPaused.includes(entity));

const isInactive = (world: World, producer: Producer): boolean => {
  if (producer.location === null) return false;
  const location = locationOf(world, producer.location);
  return location !== undefined && !location.active;
};

/** Computes the static block reasons of a producer (GDD-10.3). */
export function staticBlockReasons(
  world: World,
  entity: EntityId,
  producer: Producer,
): BlockReason[] {
  const reasons: BlockReason[] = [];
  if (isDisabled(world, entity)) reasons.push('entity_disabled');
  if (isDeficitPaused(world, entity)) reasons.push('paused_by_deficit');
  const recipe = recipeOf(producer);
  if (recipe === null) reasons.push('invalid_recipe');
  else if (recipe.condition !== null) reasons.push('condition_false');
  if (producer.inputInventory === null || producer.outputInventory === null) {
    reasons.push('missing_inventory_access');
  }
  if (isInactive(world, producer)) reasons.push('location_inactive');
  return reasons;
}

const releaseAll = (tx: TransactionWriter, producer: Producer): void => {
  tx.atomic((builder) => {
    for (const id of producer.inputReservations) builder.release(id);
    for (const id of producer.capacityReservations) builder.release(id);
  });
};

/**
 * Rebuilds producer block reasons (phase 07).
 *
 * Source: GDD-10.3
 */
export function evaluatePreconditions(world: World, tx: TransactionWriter): void {
  const store = world.stores.get<Producer>('producer');
  for (const entity of store.ids()) {
    const producer = store.get(entity);
    if (!isProducer(producer)) continue;
    const reasons = staticBlockReasons(world, entity, producer);
    if (reasons.length > 0) {
      if (producer.state === 'processing') releaseAll(tx, producer);
      store.set(entity, {
        ...producer,
        state: 'blocked',
        blockReasons: reasons,
        inputReservations: [],
        capacityReservations: [],
      });
    } else if (producer.state === 'blocked') {
      store.set(entity, { ...producer, state: 'idle', blockReasons: [] });
    }
  }
}
