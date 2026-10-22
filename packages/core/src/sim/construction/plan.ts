/**
 * Construction plan and progress accessors and the plan-creation seam for the
 * 3.3 placement command.
 *
 * Source: GDD-18.1, TDS-8.3
 */
import type { EntityId } from '../../ids/index.js';
import type { World } from '../../world/types.js';
import { setLifecycle } from './lifecycle.js';
import type { ConstructionPlan, ConstructionProgress } from './types.js';

/** Returns the construction plan of an entity, or `undefined`. */
export function constructionPlanOf(world: World, entity: EntityId): ConstructionPlan | undefined {
  return world.stores.get<ConstructionPlan>('constructionPlan').get(entity);
}

/** Returns the construction progress of an entity, or `undefined`. */
export function constructionProgressOf(
  world: World,
  entity: EntityId,
): ConstructionProgress | undefined {
  return world.stores.get<ConstructionProgress>('constructionProgress').get(entity);
}

/**
 * Creates a planned entity: stores the plan, resets the progress, and sets the
 * lifecycle to `planned`. This is the seam the 3.3 `PlaceEntityPlan` command
 * calls after a successful placement.
 *
 * Source: GDD-18.1, ARCH-5.2
 */
export function createConstructionPlan(
  world: World,
  entity: EntityId,
  plan: ConstructionPlan,
): void {
  world.stores.get<ConstructionPlan>('constructionPlan').set(entity, plan);
  world.stores.get<ConstructionProgress>('constructionProgress').set(entity, {
    progress: 0,
    startedTick: null,
    reservations: [],
    committed: plan.costs.map(() => 0),
    deconstructAt: null,
  });
  setLifecycle(world, entity, 'planned');
}
