/**
 * Production completion (phase 13, GDD-10.4, ARCH-6.2). Inputs are committed,
 * outputs deposited, and capacity reservations released as one atomic
 * composite, so a completion either does everything or nothing (INV-15).
 *
 * Source: GDD-10.4, ARCH-6.2, TDS-12.2, INV-15
 */
import type { EntityId } from '../../ids/index.js';
import type { TransactionWriter } from '../../tx/index.js';
import { findReservation } from '../../tx/ledger.js';
import type { TickScratch } from '../../pipeline/types.js';
import type { World } from '../../world/types.js';
import { effectiveDuration, isProducer, isResourceSource, planOutputs, recipeOf } from './plan.js';
import { throttlePermilleOf, throttleQuantity } from '../internal-logistics/throttle.js';
import { PENDING_OUTPUT_KEY } from './types.js';
import type { ItemAmount, Producer, ResourceSource } from './types.js';

const depositPending = (
  world: World,
  tx: TransactionWriter,
  pending: ReadonlyMap<EntityId, readonly ItemAmount[]>,
): void => {
  const sourceStore = world.stores.get<ResourceSource>('resourceSource');
  for (const entity of sourceStore.ids()) {
    const amounts = pending.get(entity);
    const source = sourceStore.get(entity);
    if (amounts === undefined || !isResourceSource(source) || source.inventory === null) continue;
    const inventory = source.inventory;
    tx.atomic((builder) => {
      for (const amount of amounts) {
        builder.deposit({
          inventory,
          resource: amount.resource,
          quantity: amount.quantity,
          source: entity,
          reason: 'source_output',
        });
      }
    });
  }
};

/**
 * Commits completed production and source output (phase 13).
 *
 * Source: GDD-10.4, ARCH-6.2, INV-15
 */
export function commitProduction(world: World, tx: TransactionWriter, scratch: TickScratch): void {
  const pending = scratch.values.get(PENDING_OUTPUT_KEY) as
    ReadonlyMap<EntityId, readonly ItemAmount[]> | undefined;
  if (pending !== undefined) depositPending(world, tx, pending);

  const producerStore = world.stores.get<Producer>('producer');
  for (const entity of producerStore.ids()) {
    const producer = producerStore.get(entity);
    if (!isProducer(producer) || producer.state !== 'processing') continue;
    const recipe = recipeOf(producer);
    if (recipe === null || producer.progress < effectiveDuration(recipe)) continue;
    const throttle = throttlePermilleOf(world, entity);
    if (throttle === 0) {
      producerStore.set(entity, {
        ...producer,
        progress: effectiveDuration(recipe),
        blockReasons: ['throughput_throttled'],
      });
      continue;
    }
    const outputInventory = producer.outputInventory;
    const outputs = planOutputs(recipe);
    const result = tx.atomic((builder) => {
      for (const id of producer.inputReservations) {
        const reservation = findReservation(world, id);
        if (reservation === null) continue;
        const quantity = throttleQuantity(reservation.quantity, throttle);
        if (quantity <= 0) {
          builder.release(id);
        } else if (quantity >= reservation.quantity) {
          builder.commit(id, reservation.quantity);
        } else {
          builder.commit(id, quantity);
          builder.release(id);
        }
      }
      for (const id of producer.capacityReservations) builder.release(id);
      if (outputInventory !== null) {
        for (const output of outputs) {
          const quantity = throttleQuantity(output.quantity, throttle);
          if (quantity <= 0) continue;
          builder.deposit({
            inventory: outputInventory,
            resource: output.resource,
            quantity,
            source: entity,
            reason: 'production_output',
          });
        }
      }
    });
    if (result.ok) {
      producerStore.set(entity, {
        ...producer,
        state: 'idle',
        blockReasons: [],
        progress: 0,
        inputReservations: [],
        capacityReservations: [],
      });
    }
  }
}
