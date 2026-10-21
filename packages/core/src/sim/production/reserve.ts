/**
 * Production reservation (phase 11, GDD-4.3, GDD-10.2). A process starts only
 * when every input and every capability requirement can be reserved in full;
 * otherwise it stays blocked. The reservation composite is all-or-nothing.
 *
 * Source: GDD-4.3, GDD-10.2, ARCH-6.2, INV-15
 */
import type { EntityId, ReservationId } from '../../ids/index.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { isProducer, planInputs, planOutputs, recipeOf } from './plan.js';
import type { BlockReason, Producer, RecipeSpec } from './types.js';

const grantedCapability = (world: World, entity: EntityId): number => {
  const allocation = world.stores.get('capabilityAllocation').get(entity) as
    { readonly granted?: number } | null | undefined;
  return allocation?.granted ?? 0;
};

const failureReason = (code: string): BlockReason => {
  if (code === 'insufficient_capacity') return 'missing_output_capacity';
  if (code === 'not_acceptable' || code === 'unknown_inventory') return 'missing_inventory_access';
  return 'missing_input';
};

const requiredCapability = (recipe: RecipeSpec): number => recipe.capabilities[0]?.quantity ?? 0;

const block = (
  store: { set(entity: EntityId, value: Producer): void },
  entity: EntityId,
  producer: Producer,
  reason: BlockReason,
): void => {
  store.set(entity, { ...producer, state: 'blocked', blockReasons: [reason] });
};

/**
 * Starts idle producers that can reserve their full inputs and output capacity
 * (phase 11).
 *
 * Source: GDD-4.3, GDD-10.2, ARCH-6.2
 */
export function reserveProductionIO(world: World, tx: TransactionWriter): void {
  const store = world.stores.get<Producer>('producer');
  for (const entity of store.ids()) {
    const producer = store.get(entity);
    if (!isProducer(producer) || producer.state !== 'idle') continue;
    const recipe = recipeOf(producer);
    if (recipe === null) continue;
    const inputInventory = producer.inputInventory;
    const outputInventory = producer.outputInventory;
    if (inputInventory === null || outputInventory === null) continue;
    const required = requiredCapability(recipe);
    if (required > 0 && grantedCapability(world, entity) < required) {
      store.set(entity, { ...producer, state: 'blocked', blockReasons: ['missing_capability'] });
      continue;
    }
    const inputs = planInputs(recipe);
    const outputs = planOutputs(recipe);
    const firstNew = world.nextReservationId;
    const result = tx.atomic((builder) => {
      for (const input of inputs) {
        builder.reserve({
          inventory: inputInventory,
          resource: input.resource,
          quantity: input.quantity,
          purpose: 'production_input',
          holder: entity,
        });
      }
      for (const output of outputs) {
        builder.reserveCapacity({
          inventory: outputInventory,
          resource: output.resource,
          quantity: output.quantity,
          holder: entity,
        });
      }
    });
    if (!result.ok) {
      block(store, entity, producer, failureReason(result.error.code));
      continue;
    }
    const created = world.ledger.reservations.filter((reservation) => reservation.id >= firstNew);
    const inputReservations: ReservationId[] = created
      .filter((reservation) => !reservation.capacity)
      .map((reservation) => reservation.id);
    const capacityReservations: ReservationId[] = created
      .filter((reservation) => reservation.capacity)
      .map((reservation) => reservation.id);
    store.set(entity, {
      ...producer,
      state: 'processing',
      blockReasons: [],
      progress: 0,
      inputReservations,
      capacityReservations,
    });
  }
}
