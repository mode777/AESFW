/**
 * Production preconditions (phase 07, GDD-10.3, GDD-9.5). Static block reasons
 * are rebuilt every tick; a blocked producer is excluded from phases 11–13 and
 * a blocked source extracts nothing. Source slot bindings and working-area
 * claims are assigned here in ascending entity-ID order.
 *
 * Source: GDD-10.3, GDD-10.2, GDD-9.5, ARCH-5.2
 */
import type { EntityId } from '../../ids/index.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { hasConnectivityRequirement, isConnected } from '../connectivity.js';
import { locationOf } from '../location.js';
import { isProducer, isResourceSource, recipeOf } from './plan.js';
import type {
  BlockReason,
  Producer,
  ResourceSource,
  SourceConditionEvaluator,
  SourceSlotBinding,
  WorkingAreaClaim,
} from './types.js';

const isDisabled = (world: World, entity: EntityId): boolean => {
  const value = world.stores.get('enabled').get(entity) as
    { readonly enabled?: boolean } | null | undefined;
  return value != null && value.enabled === false;
};

const isDeficitPaused = (world: World, entity: EntityId): boolean =>
  world.owners.owners.some((owner) => owner.deficitPaused.includes(entity));

const locationIsInactive = (world: World, location: EntityId | null): boolean => {
  if (location === null) return false;
  const component = locationOf(world, location);
  return component !== undefined && !component.active;
};

const isInactive = (world: World, producer: Producer): boolean =>
  locationIsInactive(world, producer.location);

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
  if (
    producer.inputInventory === null ||
    producer.outputInventory === null ||
    (hasConnectivityRequirement(world, entity) && !isConnected(world, entity))
  ) {
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

const slotKey = (location: EntityId, slotType: string): string => `${location}:${slotType}`;

const slotCapacity = (world: World, location: EntityId, slotType: string): number => {
  const component = locationOf(world, location);
  const slot = component?.sourceSlots?.find((entry) => entry.type === slotType);
  return slot?.count ?? 0;
};

const freeWorkingCells = (
  world: World,
  location: EntityId,
  claimed: ReadonlyMap<EntityId, number>,
): number => {
  const component = locationOf(world, location);
  if (component === undefined) return 0;
  return component.capacity - component.used - (claimed.get(location) ?? 0);
};

const sourceBaseReasons = (
  world: World,
  entity: EntityId,
  source: ResourceSource,
  evaluateCondition: SourceConditionEvaluator,
): BlockReason[] => {
  const reasons: BlockReason[] = [];
  if (isDisabled(world, entity)) reasons.push('entity_disabled');
  if (isDeficitPaused(world, entity)) reasons.push('paused_by_deficit');
  if (locationIsInactive(world, source.location)) reasons.push('location_inactive');
  if (
    source.inventory === null ||
    (hasConnectivityRequirement(world, entity) && !isConnected(world, entity))
  ) {
    reasons.push('missing_inventory_access');
  }
  if (
    source.policy === 'condition_dependent' &&
    source.condition !== undefined &&
    !evaluateCondition(world, source.condition, entity)
  ) {
    reasons.push('condition_false');
  }
  return reasons;
};

/**
 * Rebuilds source block reasons and assigns slot bindings and working-area
 * claims in ascending entity ID (phase 07).
 *
 * Source: GDD-9.5, GDD-10.3, ARCH-5.2
 */
export function evaluateSourcePreconditions(
  world: World,
  evaluateCondition: SourceConditionEvaluator,
): void {
  const store = world.stores.get<ResourceSource>('resourceSource');
  const bindingStore = world.stores.get<SourceSlotBinding>('sourceSlotBinding');
  const claimStore = world.stores.get<WorkingAreaClaim>('workingArea');
  const assignedSlots = new Map<string, number>();
  const claimedCells = new Map<EntityId, number>();

  for (const entity of store.ids()) {
    const source = store.get(entity);
    if (!isResourceSource(source)) continue;
    const reasons = sourceBaseReasons(world, entity, source, evaluateCondition);

    if (reasons.length === 0 && source.policy === 'slot_dependent') {
      const location = source.location;
      const slotType = source.slotType;
      if (location === null || slotType === undefined) {
        reasons.push('no_source_slot');
      } else {
        const used = assignedSlots.get(slotKey(location, slotType)) ?? 0;
        if (used < slotCapacity(world, location, slotType)) {
          assignedSlots.set(slotKey(location, slotType), used + 1);
        } else {
          reasons.push('no_source_slot');
        }
      }
    }

    if (reasons.length === 0 && source.policy === 'area_dependent') {
      const location = source.location;
      const cells = source.workingAreaCells;
      if (location === null || cells === undefined || cells <= 0) {
        reasons.push('no_working_area');
      } else if (cells <= freeWorkingCells(world, location, claimedCells)) {
        claimedCells.set(location, (claimedCells.get(location) ?? 0) + cells);
      } else {
        reasons.push('no_working_area');
      }
    }

    if (
      reasons.length === 0 &&
      source.policy === 'slot_dependent' &&
      source.location !== null &&
      source.slotType !== undefined
    ) {
      bindingStore.set(entity, { slotType: source.slotType, location: source.location });
    } else if (bindingStore.has(entity)) {
      bindingStore.markRemoved(entity);
    }

    if (
      reasons.length === 0 &&
      source.policy === 'area_dependent' &&
      source.location !== null &&
      source.workingAreaCells !== undefined
    ) {
      claimStore.set(entity, {
        location: source.location,
        cells: source.workingAreaCells,
        exclusive: source.workingAreaExclusive ?? true,
      });
    } else if (claimStore.has(entity)) {
      claimStore.markRemoved(entity);
    }

    if (reasons.length > 0) {
      store.set(entity, { ...source, blockReasons: reasons });
    } else if (source.blockReasons !== undefined) {
      const cleared = { ...source } as {
        -readonly [K in keyof ResourceSource]: ResourceSource[K];
      };
      delete cleared.blockReasons;
      store.set(entity, cleared);
    }
  }
}
