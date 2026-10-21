/**
 * Capability allocation (ARCH-13 steps 4–6). Groups consumer requests by pool,
 * allocates each pool under its model, publishes allocation components, and
 * emits shortage events.
 *
 * Source: GDD-14.1, GDD-14.2, GDD-4.7, ARCH-13, INV-05
 */
import type { EventWriter } from '../../events/event-writer.js';
import { compareStrings } from '../../det/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import { locationOf } from '../location.js';
import type { World } from '../../world/types.js';
import { allocateModel } from './models.js';
import type { CapabilityRequest } from './models.js';
import type { CapabilityConsumer, CapabilityPool, CapabilitySupply } from './types.js';

const candidateCapabilities = (consumer: CapabilityConsumer): readonly DefinitionHandle[] => [
  consumer.capability,
  ...consumer.substitutes,
];

const poolMatches = (pool: CapabilityPool, consumer: CapabilityConsumer): boolean =>
  pool.scope === consumer.scope && pool.location === consumer.location;

const inactiveLocation = (world: World, consumer: CapabilityConsumer): boolean => {
  if (consumer.scope !== 'location' || consumer.location === null) return false;
  const location = locationOf(world, consumer.location);
  return location !== undefined && !location.active;
};

/**
 * Allocates `supply` across the world's capability consumers and publishes the
 * results (phase 06).
 *
 * Source: GDD-14.2, ARCH-13, INV-05
 */
export function allocateCapabilities(
  world: World,
  supply: CapabilitySupply,
  events: EventWriter,
): void {
  const consumerStore = world.stores.get<CapabilityConsumer>('capabilityConsumer');
  const allocationStore = world.stores.get('capabilityAllocation');
  const consumers = consumerStore.ids();
  const eligible = new Map<EntityId, number>();
  const remaining = new Map<EntityId, number>();
  for (const entity of consumers) {
    const consumer = consumerStore.get(entity);
    if (consumer === undefined) continue;
    const active = consumer.request > 0 && !inactiveLocation(world, consumer);
    eligible.set(entity, active ? consumer.request : 0);
    remaining.set(entity, active ? consumer.request : 0);
  }

  const keys = [...supply.keys()].sort(compareStrings);
  for (const key of keys) {
    const pool = supply.get(key);
    if (pool === undefined) continue;
    const group: CapabilityRequest[] = [];
    const groupConsumers: CapabilityConsumer[] = [];
    for (const entity of consumers) {
      const consumer = consumerStore.get(entity);
      if (consumer === undefined) continue;
      const left = remaining.get(entity) ?? 0;
      if (left <= 0) continue;
      if (!poolMatches(pool, consumer)) continue;
      if (!candidateCapabilities(consumer).includes(pool.capability)) continue;
      group.push({
        entity,
        request: left,
        priority: consumer.priority,
        weight: consumer.weight,
      });
      groupConsumers.push(consumer);
    }
    const model = groupConsumers[0]?.model ?? 'proportional';
    const grants = allocateModel(model, pool.supply, group);
    for (let index = 0; index < group.length; index += 1) {
      const request = group[index];
      if (request === undefined) continue;
      remaining.set(request.entity, request.request - (grants[index] ?? 0));
    }
  }

  for (const entity of consumers) {
    const consumer = consumerStore.get(entity);
    if (consumer === undefined) continue;
    const request = eligible.get(entity) ?? 0;
    const left = remaining.get(entity) ?? 0;
    const granted = request - left;
    allocationStore.set(entity, {
      capability: consumer.capability,
      granted,
      shortage: left,
    });
    if (left > 0) {
      events.emit({
        type: 'CapabilityShortageDetected',
        subjects: [entity],
        owner: null,
        location: consumer.location,
        payload: {
          capability: consumer.capability,
          request,
          granted,
          shortage: left,
        },
      });
    }
  }
}
