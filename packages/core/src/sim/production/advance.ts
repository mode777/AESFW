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
import { throttlePermilleOf } from '../internal-logistics/throttle.js';
import { advanceSource } from './sources.js';
import { isProducer, isResourceSource } from './plan.js';
import { PENDING_OUTPUT_KEY } from './types.js';
import type { ItemAmount, Producer, ResourceSource } from './types.js';

const isBlocked = (source: ResourceSource): boolean => (source.blockReasons?.length ?? 0) > 0;

export const sourceScalePermille = (world: World, source: ResourceSource): number => {
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
    const recipe =
      producer.recipe === null
        ? null
        : (producer.recipes.find((entry) => entry.recipe === producer.recipe) ?? null);
    const duration = recipe === null ? 1 : recipe.mode === 'batch' ? recipe.duration : 1;
    const progress = producer.progress + 1 > duration ? duration : producer.progress + 1;
    producerStore.set(entity, { ...producer, progress });
  }

  const sourceStore = world.stores.get<ResourceSource>('resourceSource');
  const pending = new Map<EntityId, readonly ItemAmount[]>();
  for (const entity of sourceStore.ids()) {
    const source = sourceStore.get(entity);
    if (!isResourceSource(source) || isBlocked(source)) continue;
    const tick = advanceSource(
      source,
      sourceScalePermille(world, source),
      throttlePermilleOf(world, entity),
    );
    if (tick.amounts.length > 0) pending.set(entity, tick.amounts);
    sourceStore.set(entity, tick.source);
  }
  scratch.values.set(PENDING_OUTPUT_KEY, pending);
}
