/**
 * The tier-transition engine (phase 24, GDD-13). Starts transitions through
 * the command or a trigger, pays costs atomically with the
 * `population_transition` purpose, and completes them with the configured
 * population conversion, refund policy, and empty-residence policy.
 *
 * Source: GDD-13, CONT-6.15, ARCH-6
 */
import type { EventWriter } from '../../events/event-writer.js';
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId, Tick } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { sharedLocationPolicy } from '../../policies/inventory-access/index.js';
import type { PlacementConditionEvaluator } from '../placement/types.js';
import { isPopulationGroup, isResidence } from '../population/types.js';
import type { PopulationGroup } from '../population/types.js';
import { updateBands } from '../population/bands.js';
import { resolveGrowthPolicy } from '../population/growth.js';
import type { BandState } from '../population/bands.js';
import type { ConstructionProgress } from '../construction/types.js';
import {
  declineTransitionsOf,
  emptyResidencePolicyOf,
  residenceCapacityOf,
  transitionDefinitionOf,
  transitionDefinitionsOf,
} from './definitions.js';
import { residenceFromDefinition } from './instantiate.js';
import type {
  PopulationConversion,
  RunningTransition,
  TransitionCost,
  TransitionDefinition,
} from './types.js';

const COST_PURPOSE = 'population_transition' as const;

const withdrawCosts = (
  world: World,
  tx: TransactionWriter,
  entity: EntityId,
  location: EntityId,
  costs: readonly TransitionCost[],
): boolean => {
  if (costs.length === 0) return true;
  const inventoryStore = world.stores.get<{
    readonly entries: readonly { readonly resource: DefinitionHandle; readonly quantity: Int }[];
  }>('inventory');
  for (const cost of costs) {
    const accessible = sharedLocationPolicy.accessibleInventories(
      world,
      location,
      cost.resource,
      COST_PURPOSE,
    );
    let available = 0;
    for (const inventory of accessible) {
      available +=
        inventoryStore.get(inventory)?.entries.find((entry) => entry.resource === cost.resource)
          ?.quantity ?? 0;
    }
    if (available < cost.quantity) return false;
  }
  const result = tx.atomic((builder) => {
    for (const cost of costs) {
      if (cost.quantity <= 0) continue;
      const inventories = sharedLocationPolicy.accessibleInventories(
        world,
        location,
        cost.resource,
        COST_PURPOSE,
      );
      let remaining = cost.quantity;
      for (const inventory of inventories) {
        if (remaining <= 0) break;
        const stored =
          inventoryStore.get(inventory)?.entries.find((entry) => entry.resource === cost.resource)
            ?.quantity ?? 0;
        const take = stored < remaining ? stored : remaining;
        if (take <= 0) continue;
        builder.withdraw({
          inventory,
          resource: cost.resource,
          quantity: take,
          purpose: COST_PURPOSE,
          sink: entity,
          reason: 'transition_cost',
        });
        remaining -= take;
      }
    }
  });
  return result.ok;
};

const depositRefund = (
  world: World,
  tx: TransactionWriter,
  entity: EntityId,
  location: EntityId,
  costs: readonly TransitionCost[],
  refund: TransitionDefinition['refund'],
): void => {
  const lines =
    refund.policy === 'resources'
      ? refund.resources
      : refund.policy === 'fraction'
        ? costs.map((cost) => ({
            resource: cost.resource,
            quantity: Math.floor((cost.quantity * refund.fraction) / 1000),
          }))
        : [];
  if (lines.length === 0) return;
  const inventory = sharedLocationPolicy.accessibleInventories(
    world,
    location,
    lines[0]?.resource ?? (0 as DefinitionHandle),
    COST_PURPOSE,
  )[0];
  if (inventory === undefined) return;
  tx.atomic((builder) => {
    for (const line of lines) {
      if (line.quantity <= 0) continue;
      builder.deposit({
        inventory,
        resource: line.resource,
        quantity: line.quantity,
        source: entity,
        reason: 'transition_refund',
      });
    }
  });
};

const convertedCount = (
  conversion: PopulationConversion,
  count: Int,
  sourceCapacity: Int,
  targetCapacity: Int,
  definition: TransitionDefinition,
): Int => {
  switch (conversion) {
    case 'retain_count':
      return count;
    case 'retain_count_clamped':
    case 'clamp_to_target_capacity':
      return count < targetCapacity ? count : targetCapacity;
    case 'retain_occupancy_ratio':
      return sourceCapacity <= 0 ? 0 : Math.floor((count * targetCapacity) / sourceCapacity);
    case 'set_fixed':
      return definition.conversion.populationCount;
    case 'apply_multiplier':
      return Math.floor((count * definition.conversion.populationMultiplier) / 1000);
  }
};

/**
 * Starts a transition for a residence, paying its costs atomically. Returns
 * true when the transition started.
 *
 * Source: GDD-13.1, CONT-6.15
 */
export function startTransition(
  world: World,
  tx: TransactionWriter,
  events: EventWriter,
  entity: EntityId,
  definition: TransitionDefinition,
  tick: Tick,
): boolean {
  const residence = world.stores.get('residence').get(entity) as
    { readonly location: EntityId | null } | undefined;
  const location = residence?.location ?? null;
  if (location === null) return false;
  if (!withdrawCosts(world, tx, entity, location, definition.costs)) return false;
  const running: RunningTransition = {
    transition: definition.transition,
    sourceTier: definition.sourceTier,
    targetTier: definition.targetTier,
    startedTick: tick,
    completesAt: (tick + definition.durationTicks) as Tick,
  };
  world.stores.get<RunningTransition>('transition').set(entity, running);
  events.emit({
    type: 'TransitionStarted',
    subjects: [entity],
    owner: null,
    location,
    payload: { transition: definition.transition, completes_at: running.completesAt },
  });
  return true;
}

const completeTransition = (
  world: World,
  registry: Registry,
  tx: TransactionWriter,
  events: EventWriter,
  entity: EntityId,
  running: RunningTransition,
  definition: TransitionDefinition,
): void => {
  const residenceStore = world.stores.get('residence');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const residence = residenceStore.get(entity) as
    | {
        readonly capacity: Int;
        readonly location: EntityId | null;
        readonly tier: DefinitionHandle;
      }
    | undefined;
  const group = groupStore.get(entity);
  if (residence === undefined || !isPopulationGroup(group)) return;
  const targetDefinition = definition.conversion.entityDefinition;
  const targetCapacity =
    (targetDefinition !== null ? residenceCapacityOf(registry, targetDefinition) : null) ??
    residence.capacity;
  const nextCount = convertedCount(
    definition.conversion.population,
    group.count,
    residence.capacity,
    targetCapacity,
    definition,
  );
  const replacement =
    targetDefinition !== null
      ? residenceFromDefinition(registry, targetDefinition, residence.location)
      : null;
  if (replacement !== null) {
    residenceStore.set(entity, replacement);
    world.stores.get('definition').set(entity, { definition: targetDefinition });
    const growth = resolveGrowthPolicy(registry, replacement.growthPolicy ?? definition.transition);
    if (growth !== null) world.stores.get('growth').set(entity, growth);
    groupStore.set(entity, {
      ...group,
      tier: replacement.tier,
      count: nextCount,
      capacity: replacement.capacity,
    });
  } else {
    residenceStore.set(entity, {
      ...residence,
      tier: definition.targetTier,
      capacity: targetCapacity,
    });
    groupStore.set(entity, {
      ...group,
      tier: definition.targetTier,
      count: nextCount,
      capacity: targetCapacity,
    });
  }
  if (residence.location !== null) {
    depositRefund(world, tx, entity, residence.location, definition.costs, definition.refund);
  }
  world.stores.get<RunningTransition>('transition').markRemoved(entity);
  // The target tier has different bands; recompute the derived band state now
  // so the stale decline trigger cannot re-fire in this tick and INV-09 holds
  // at the end of it.
  updateBands(world, registry);
  events.emit({
    type: 'TransitionCompleted',
    subjects: [entity],
    owner: null,
    location: residence.location,
    payload: { transition: definition.transition, population: nextCount },
  });
};

/** Applies a residence's empty-residence policy when its population is zero. */
const applyEmptyResidence = (
  world: World,
  registry: Registry,
  entity: EntityId,
  tick: Tick,
): void => {
  const definitionStore = world.stores.get<{ readonly definition: DefinitionHandle }>('definition');
  const definition = definitionStore.get(entity)?.definition;
  if (definition === undefined) return;
  const policy = emptyResidencePolicyOf(registry, definition);
  if (policy === null || policy.policy === 'retain') return;
  const residenceStore = world.stores.get('residence');
  const residence = residenceStore.get(entity) as
    { readonly location: EntityId | null } | undefined;
  if (policy.policy === 'revert') {
    if (policy.definition === definition) return;
    const replacement = residenceFromDefinition(
      registry,
      policy.definition,
      residence?.location ?? null,
    );
    if (replacement === null) return;
    residenceStore.set(entity, replacement);
    definitionStore.set(entity, { definition: policy.definition });
    const growth = resolveGrowthPolicy(registry, replacement.growthPolicy ?? policy.definition);
    if (growth !== null) world.stores.get('growth').set(entity, growth);
    return;
  }
  const progressStore = world.stores.get<ConstructionProgress>('constructionProgress');
  if (progressStore.get(entity) !== undefined) return;
  progressStore.set(entity, {
    progress: 0,
    startedTick: null,
    reservations: [],
    committed: [],
    deconstructAt: (tick + policy.delayTicks) as Tick,
  });
  world.stores.get('lifecycle').set(entity, { lifecycle: 'active' });
};

/**
 * Advances tier transitions (phase 24): completes due transitions, starts
 * automatic and decline triggers, and applies empty-residence policies.
 *
 * Source: GDD-13, CONT-6.15
 */
export function advanceTransitions(
  world: World,
  registry: Registry,
  tx: TransactionWriter,
  events: EventWriter,
  tick: Tick,
  conditionEvaluator: PlacementConditionEvaluator = () => true,
): void {
  const residenceStore = world.stores.get('residence');
  const groupStore = world.stores.get<PopulationGroup>('populationGroup');
  const transitionStore = world.stores.get<RunningTransition>('transition');
  const bandStore = world.stores.get<BandState>('bandState');
  const definitions = transitionDefinitionsOf(registry);

  // Complete due transitions in ascending entity ID.
  for (const entity of transitionStore.ids()) {
    const running = transitionStore.get(entity);
    if (running === undefined || tick < running.completesAt) continue;
    const definition = transitionDefinitionOf(registry, running.transition);
    if (definition === null) {
      transitionStore.markRemoved(entity);
      continue;
    }
    completeTransition(world, registry, tx, events, entity, running, definition);
  }

  // Empty-residence policies.
  for (const entity of residenceStore.ids()) {
    const group = groupStore.get(entity);
    if (!isPopulationGroup(group) || group.count > 0) continue;
    if (transitionStore.get(entity) !== undefined) continue;
    applyEmptyResidence(world, registry, entity, tick);
  }

  // Automatic, condition-duration, and decline triggers.
  for (const entity of residenceStore.ids()) {
    const residence = residenceStore.get(entity);
    if (!isResidence(residence)) continue;
    if (transitionStore.get(entity) !== undefined) continue;
    const group = groupStore.get(entity);
    if (!isPopulationGroup(group) || group.count <= 0) continue;

    const band = bandStore.get(entity);
    if (
      band !== undefined &&
      band.declineGraceTicks !== null &&
      band.declineTicks >= band.declineGraceTicks
    ) {
      const decline = declineTransitionFor(world, registry, residence.tier, band);
      if (decline !== null && startTransition(world, tx, events, entity, decline, tick)) continue;
    }
    for (const definition of definitions) {
      if (definition.sourceTier !== residence.tier) continue;
      if (definition.trigger !== 'automatic' && definition.trigger !== 'condition_duration')
        continue;
      if (
        definition.condition !== null &&
        !conditionEvaluator(world, definition.condition, entity)
      ) {
        continue;
      }
      if (startTransition(world, tx, events, entity, definition, tick)) break;
    }
  }
}

const declineTransitionFor = (
  world: World,
  registry: Registry,
  tier: DefinitionHandle,
  band: BandState,
): TransitionDefinition | null => {
  void world;
  const named = band.declineTransition;
  if (named !== null) return transitionDefinitionOf(registry, named);
  const declines = declineTransitionsOf(registry, tier);
  if (declines.length !== 1) return null;
  const handle = declines[0];
  return handle === undefined ? null : transitionDefinitionOf(registry, handle);
};
