/**
 * Lifecycle state accessors, the transition relation of GDD-9.1, and the
 * phase-03 reconciliation of the operational states `disabled` and `blocked`.
 *
 * Source: GDD-9.1, ARCH-3.4, ARCH-5.2, TDS-8.3
 */
import type { EntityId } from '../../ids/index.js';
import type { Producer } from '../production/index.js';
import type { World } from '../../world/types.js';
import type { Lifecycle, LifecycleState } from './types.js';

/** The lifecycle states in the order they are documented. */
export const LIFECYCLE_STATES: readonly LifecycleState[] = [
  'planned',
  'awaiting_resources',
  'constructing',
  'active',
  'disabled',
  'blocked',
  'deconstructed',
  'cancelled',
];

/** The permitted transitions, a total-order relation (GDD-9.1). */
export const LIFECYCLE_TRANSITIONS: Readonly<Record<LifecycleState, readonly LifecycleState[]>> = {
  planned: ['awaiting_resources', 'constructing', 'cancelled'],
  awaiting_resources: ['constructing', 'cancelled'],
  constructing: ['active', 'cancelled'],
  active: ['disabled', 'blocked', 'deconstructed'],
  disabled: ['active', 'blocked', 'deconstructed'],
  blocked: ['active', 'disabled', 'deconstructed'],
  deconstructed: [],
  cancelled: [],
};

/** True when `from` may transition to `to` (GDD-9.1). */
export function canTransition(from: LifecycleState, to: LifecycleState): boolean {
  return LIFECYCLE_TRANSITIONS[from].includes(to);
}

/** Returns the stored lifecycle state of an entity, or `undefined`. */
export function lifecycleOf(world: World, entity: EntityId): LifecycleState | undefined {
  return world.stores.get<Lifecycle>('lifecycle').get(entity)?.lifecycle;
}

/** Stores the lifecycle state of an entity. */
export function setLifecycle(world: World, entity: EntityId, state: LifecycleState): void {
  world.stores.get<Lifecycle>('lifecycle').set(entity, { lifecycle: state });
}

/**
 * Reconciles the operational states `disabled` and `blocked` for every entity
 * that already carries a `lifecycle` component, in ascending entity ID
 * (GDD-9.1). `disabled` follows the `enabled` component; `blocked` follows the
 * producer's block state as of the previous tick.
 *
 * Source: GDD-9.1, ARCH-5.2
 */
export function reconcileOperationalStates(world: World): void {
  const store = world.stores.get<Lifecycle>('lifecycle');
  const enabledStore = world.stores.get<{ readonly enabled: boolean }>('enabled');
  const producerStore = world.stores.get<Producer>('producer');
  for (const entity of store.ids()) {
    const state = lifecycleOf(world, entity);
    if (state !== 'active' && state !== 'disabled' && state !== 'blocked') continue;
    const enabled = enabledStore.get(entity)?.enabled ?? true;
    if (!enabled) {
      setLifecycle(world, entity, 'disabled');
      continue;
    }
    const producer = producerStore.get(entity);
    setLifecycle(world, entity, producer?.state === 'blocked' ? 'blocked' : 'active');
  }
}
