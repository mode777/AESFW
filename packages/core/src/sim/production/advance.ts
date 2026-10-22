/**
 * Process advancement (phase 12, GDD-10.2, GDD-10.4). Producers advance one
 * tick; non-blocked sources compute their pending output, deplete finite and
 * regenerating deposits, and scale by a location property.
 *
 * Source: GDD-10.2, GDD-10.4, GDD-9.5, GDD-6.5
 */
import type { EntityId } from '../../ids/index.js';
import type { World } from '../../world/types.js';
import type { TickScratch } from '../../pipeline/types.js';
import { locationOf } from '../location.js';
import { advanceSource } from './sources.js';
import { isProducer, isResourceSource } from './plan.js';
import { PENDING_OUTPUT_KEY } from './types.js';
import type { ItemAmount, Producer, ResourceSource } from './types.js';

const isBlocked = (source: ResourceSource): boolean => (source.blockReasons?.length ?? 0) > 0;

const scalePermilleOf = (world: World, source: ResourceSource): number => {
  if (
    source.policy !== 'area_dependent' ||
    source.scaleByProperty === undefined ||
    source.location === null
  ) {
    return 1000;
  }
  const location = locationOf(world, source.location);
  const property = location?.properties.find((entry) => entry.property === source.scaleByProperty);
  return property?.value ?? 0;
};

/**
 * Advances producers and sources (phase 12).
 *
 * Source: GDD-10.2, GDD-10.4
 */
export function advanceProcesses(world: World, scratch: TickScratch): void {
  const producerStore = world.stores.get<Producer>('producer');
  for (const entity of producerStore.ids()) {
    const producer = producerStore.get(entity);
    if (!isProducer(producer) || producer.state !== 'processing') continue;
    producerStore.set(entity, { ...producer, progress: producer.progress + 1 });
  }

  const sourceStore = world.stores.get<ResourceSource>('resourceSource');
  const pending = new Map<EntityId, readonly ItemAmount[]>();
  for (const entity of sourceStore.ids()) {
    const source = sourceStore.get(entity);
    if (!isResourceSource(source) || isBlocked(source)) continue;
    const tick = advanceSource(source, scalePermilleOf(world, source));
    if (tick.amounts.length > 0) pending.set(entity, tick.amounts);
    sourceStore.set(entity, tick.source);
  }
  scratch.values.set(PENDING_OUTPUT_KEY, pending);
}
