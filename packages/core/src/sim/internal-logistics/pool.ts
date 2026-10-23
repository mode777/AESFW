/**
 * Throughput pool construction, request collection (phase 09), and
 * proportional allocation (phase 10). Sources, producers, and residences are
 * visited in ascending entity ID; `alloc-v1` supplies the deterministic
 * remainder rule.
 *
 * Source: GDD-6.6, GDD-15.1, ARCH-5.2, TDS-6.3, TDS-11.3
 */
import { allocate, mulDiv } from '../../fx/index.js';
import type { Int } from '../../fx/index.js';
import type { EntityId } from '../../ids/index.js';
import type { EventWriter } from '../../events/event-writer.js';
import type { Registry } from '../../registry/types.js';
import type { TickScratch } from '../../pipeline/types.js';
import type { World } from '../../world/types.js';
import { buildCapabilitySupply, poolKey } from '../capabilities/index.js';
import type { CapabilitySupply } from '../capabilities/index.js';
import { locationOf } from '../location.js';
import { lifecycleOf } from '../construction/lifecycle.js';
import { isNeedStates } from '../needs/types.js';
import type { NeedStates } from '../needs/types.js';
import { isResidence } from '../population/types.js';
import {
  effectiveDuration,
  isProducer,
  isResourceSource,
  planInputs,
  planOutputs,
  recipeOf,
} from '../production/plan.js';
import { sourceScalePermille } from '../production/advance.js';
import { advanceSource } from '../production/sources.js';
import type { Producer, ResourceSource } from '../production/types.js';
import type { Residence } from '../population/types.js';
import { storageThroughputBonus } from './storage.js';
import { THROUGHPUT_LIMITED_POLICY, THROUGHPUT_REQUESTS_KEY } from './types.js';
import type { ThroughputAllocation, ThroughputPool, ThroughputRequest } from './types.js';

const EXCLUDED_LIFECYCLES = new Set([
  'planned',
  'awaiting_resources',
  'constructing',
  'cancelled',
  'deconstructed',
]);

const isDisabled = (world: World, entity: EntityId): boolean => {
  const value = world.stores.get('enabled').get(entity) as
    { readonly enabled?: boolean } | null | undefined;
  return value != null && value.enabled === false;
};

const isDeficitPaused = (world: World, entity: EntityId): boolean =>
  world.owners.owners.some((owner) => owner.deficitPaused.includes(entity));

const isExcluded = (world: World, entity: EntityId, location: EntityId | null): boolean => {
  if (isDisabled(world, entity) || isDeficitPaused(world, entity)) return true;
  const lifecycle = lifecycleOf(world, entity);
  if (lifecycle !== undefined && EXCLUDED_LIFECYCLES.has(lifecycle)) return true;
  if (location === null) return false;
  const component = locationOf(world, location);
  return component !== undefined && !component.active;
};

const hasBlockingReason = (reasons: readonly string[] | undefined): boolean =>
  (reasons ?? []).some((reason) => reason !== 'throughput_throttled');

/** Returns the throughput pool of a location, or `undefined` when unbounded. */
export function throughputPoolOf(world: World, location: EntityId): ThroughputPool | undefined {
  return world.stores.get<ThroughputPool>('throughputPool').get(location);
}

/**
 * Recomputes a location's capacity from its base and its location-scoped
 * capability supply (phase 10). A missing supply is rebuilt from providers so
 * that `runPhases([9, 10])` works without phase 05.
 *
 * Source: GDD-6.6, GDD-15.1
 */
export function throughputCapacity(
  world: World,
  pool: ThroughputPool,
  location: EntityId,
  supply?: CapabilitySupply,
): Int {
  let capacity = pool.baseCapacity + storageThroughputBonus(world, location);
  if (pool.baseThroughputCapability !== null) {
    const pools = supply ?? buildCapabilitySupply(world);
    const key = poolKey('location', location, pool.baseThroughputCapability);
    capacity += pools.get(key)?.supply ?? 0;
  }
  return capacity;
}

const producerMovesThisTick = (producer: Producer): boolean => {
  const recipe = recipeOf(producer);
  if (recipe === null) return false;
  const duration = effectiveDuration(recipe);
  if (producer.state === 'processing') return producer.progress + 1 >= duration;
  return producer.state === 'idle' && duration === 1;
};

const itemTotal = (items: readonly { readonly quantity: Int }[]): Int => {
  let total = 0;
  for (const item of items) total += item.quantity;
  return total;
};

/**
 * Collects the throughput requests of the tick (phase 09).
 *
 * Source: GDD-15.1, ARCH-5.2, TDS-11.3
 */
export function collectThroughputRequests(world: World, scratch: TickScratch): void {
  const requests = new Map<EntityId, ThroughputRequest>();
  const add = (entity: EntityId, location: EntityId | null, quantity: Int): void => {
    if (location === null || quantity <= 0) return;
    const pool = throughputPoolOf(world, location);
    if (pool === undefined || pool.policy !== THROUGHPUT_LIMITED_POLICY) return;
    const existing = requests.get(entity);
    requests.set(entity, {
      entity,
      location,
      quantity: (existing?.quantity ?? 0) + quantity,
    });
  };

  const producerStore = world.stores.get<Producer>('producer');
  for (const entity of producerStore.ids()) {
    const producer = producerStore.get(entity);
    if (!isProducer(producer)) continue;
    if (producer.location === null) continue;
    if (hasBlockingReason(producer.blockReasons)) continue;
    if (isExcluded(world, entity, producer.location)) continue;
    if (!producerMovesThisTick(producer)) continue;
    const recipe = recipeOf(producer);
    if (recipe === null) continue;
    const quantity = itemTotal(planInputs(recipe)) + itemTotal(planOutputs(recipe));
    add(entity, producer.location, quantity);
  }

  const sourceStore = world.stores.get<ResourceSource>('resourceSource');
  for (const entity of sourceStore.ids()) {
    const source = sourceStore.get(entity);
    if (!isResourceSource(source)) continue;
    if (source.location === null) continue;
    if (hasBlockingReason(source.blockReasons)) continue;
    if (isExcluded(world, entity, source.location)) continue;
    const planned = advanceSource(source, sourceScalePermille(world, source), 1000);
    add(entity, source.location, itemTotal(planned.amounts));
  }

  const residenceStore = world.stores.get<Residence>('residence');
  const needStore = world.stores.get<NeedStates>('needStates');
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    if (residence.location === null) continue;
    if (isExcluded(world, entity, residence.location)) continue;
    const states = needStore.get(entity);
    if (!isNeedStates(states)) continue;
    let quantity = 0;
    for (const state of states.needs) {
      const spec = (residence.needs ?? []).find((entry) => entry.need === state.need);
      if (spec === undefined || spec.type !== 'resource_consumption') continue;
      quantity += state.demanded;
    }
    add(entity, residence.location, quantity);
  }

  const ordered = [...requests.values()].sort((a, b) => a.entity - b.entity);
  scratch.values.set(THROUGHPUT_REQUESTS_KEY, ordered);
}

/** Reads phase 09's requests (empty before it runs). */
export function readThroughputRequests(scratch: TickScratch): readonly ThroughputRequest[] {
  const value = scratch.values.get(THROUGHPUT_REQUESTS_KEY);
  return Array.isArray(value) ? (value as readonly ThroughputRequest[]) : [];
}

/**
 * Allocates each location's throughput pool across its requesters (phase 10).
 *
 * Source: GDD-15.1, TDS-6.3, INV-06
 */
export function allocateThroughput(
  world: World,
  registry: Registry,
  scratch: TickScratch,
  events: EventWriter,
): void {
  void registry;
  const requests = readThroughputRequests(scratch);
  const byLocation = new Map<EntityId, ThroughputRequest[]>();
  for (const request of requests) {
    const list = byLocation.get(request.location);
    if (list === undefined) byLocation.set(request.location, [request]);
    else list.push(request);
  }

  const poolStore = world.stores.get<ThroughputPool>('throughputPool');
  const allocationStore = world.stores.get<ThroughputAllocation>('throughputAllocation');
  const written = new Set<EntityId>();
  const supply = buildCapabilitySupply(world);

  for (const location of poolStore.ids()) {
    const pool = poolStore.get(location);
    if (pool === undefined || pool.policy !== THROUGHPUT_LIMITED_POLICY) continue;
    const capacity = throughputCapacity(world, pool, location, supply);
    const group = (byLocation.get(location) ?? []).sort((a, b) => a.entity - b.entity);
    const quantities = group.map((request) => request.quantity);
    const result = allocate(capacity, quantities);
    let grantedTotal = 0;
    let requestedTotal = 0;
    for (let index = 0; index < group.length; index += 1) {
      const request = group[index];
      if (request === undefined) continue;
      const granted = result.grants[index] ?? 0;
      const throttlePermille = result.throttlePermille[index] ?? 1000;
      grantedTotal += granted;
      requestedTotal += request.quantity;
      allocationStore.set(request.entity, {
        location,
        requested: request.quantity,
        granted,
        throttlePermille,
      });
      written.add(request.entity);
      if (throttlePermille < 1000) {
        events.emit({
          type: 'ThroughputThrottled',
          subjects: [request.entity],
          owner: null,
          location,
          payload: {
            requested: request.quantity,
            granted,
            throttle_permille: throttlePermille,
          },
        });
      }
    }
    const throttlePermille =
      requestedTotal === 0 ? 1000 : mulDiv(grantedTotal, 1000, requestedTotal, 'floor');
    poolStore.set(location, {
      ...pool,
      capacity,
      requested: requestedTotal,
      throttlePermille,
    });
  }

  for (const entity of allocationStore.ids()) {
    if (!written.has(entity)) allocationStore.markRemoved(entity);
  }
}
