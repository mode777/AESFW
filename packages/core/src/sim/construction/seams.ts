/**
 * Lifecycle seams for the placement commands owned by roadmap row 3.3
 * (`CancelEntityPlan`, `DeconstructEntity`). They change only the lifecycle and
 * progress state; the quantity effects run in phase 30. The commands themselves
 * are not implemented here.
 *
 * Source: GDD-9.1, GDD-18.3, ARCH-7.3, TDS-16.2
 */
import { tick } from '../../ids/index.js';
import type { EntityId, Tick } from '../../ids/index.js';
import type { World } from '../../world/types.js';
import { lifecycleOf, setLifecycle } from './lifecycle.js';
import { constructionPlanOf, constructionProgressOf } from './plan.js';
import type { ConstructionProgress } from './types.js';

/**
 * Requests cancellation of a plan. Applies only from `planned`,
 * `awaiting_resources`, or `constructing` and returns whether it applied.
 *
 * Source: GDD-9.1, GDD-18.1
 */
export function requestCancellation(world: World, entity: EntityId): boolean {
  const state = lifecycleOf(world, entity);
  if (state !== 'planned' && state !== 'awaiting_resources' && state !== 'constructing') {
    return false;
  }
  setLifecycle(world, entity, 'cancelled');
  return true;
}

/**
 * Requests deconstruction of an entity. Applies only from `active`, `disabled`,
 * or `blocked` when the plan declares a deconstruction policy, and sets the
 * deadline to `atTick` plus the policy duration.
 *
 * Source: GDD-9.1, GDD-18.3
 */
export function requestDeconstruction(world: World, entity: EntityId, atTick: Tick): boolean {
  const state = lifecycleOf(world, entity);
  if (state !== 'active' && state !== 'disabled' && state !== 'blocked') return false;
  const plan = constructionPlanOf(world, entity);
  const progress = constructionProgressOf(world, entity);
  if (plan === undefined || progress === undefined || plan.deconstruct === null) return false;
  const updated: ConstructionProgress = {
    ...progress,
    deconstructAt: tick(atTick + plan.deconstruct.duration),
  };
  world.stores.get<ConstructionProgress>('constructionProgress').set(entity, updated);
  return true;
}
