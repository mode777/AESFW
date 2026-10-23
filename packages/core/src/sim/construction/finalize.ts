/**
 * Phase 30 — lifecycle finalization (TDS-11.1, TDS-12.3). Releases expired
 * reservations, completes cancellation and deconstruction, removes the
 * finalized entities, compacts every component store (INV-24), and marks the
 * derived caches dirty.
 *
 * Source: GDD-9.1, GDD-18.3, TDS-11.1, TDS-12.3, TDS-8.2, INV-24
 */
import type { EntityId, Tick } from '../../ids/index.js';
import type { EventWriter } from '../../events/event-writer.js';
import { releaseExpiredReservations } from '../../tx/expire.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { lifecycleOf, setLifecycle } from './lifecycle.js';
import { releaseReservations } from './reserve.js';
import type { ConstructionPlan, ConstructionProgress, Lifecycle } from './types.js';

/** Tombstones every component of `entity`. */
export function removeEntity(world: World, entity: EntityId): void {
  for (const kind of world.stores.kinds) {
    world.stores.get(kind).markRemoved(entity);
  }
}

/** Drops every tombstone so no removed entity survives the phase (INV-24). */
export function compactStores(world: World): void {
  for (const kind of world.stores.kinds) {
    world.stores.get(kind).compact();
  }
}

const completeDeconstruction = (
  world: World,
  tx: TransactionWriter,
  entity: EntityId,
  plan: ConstructionPlan,
  progress: ConstructionProgress,
): void => {
  const policy = plan.deconstruct;
  if (policy === null) return;
  if (policy.cancelReservations) releaseReservations(world, tx, progress.reservations);
  if (plan.inventory !== null) {
    const inventory = plan.inventory;
    tx.atomic((builder) => {
      for (const line of policy.returns) {
        builder.deposit({
          inventory,
          resource: line.resource,
          quantity: line.quantity,
          source: entity,
          reason: 'deconstruction_return',
        });
      }
    });
  }
};

/**
 * Runs phase 30 (TDS-11.1). Entities are processed in ascending entity ID.
 *
 * Source: GDD-9.1, GDD-18.3, TDS-11.1, TDS-12.3, INV-24
 */
export function finalizeLifecycle(
  world: World,
  tx: TransactionWriter,
  events: EventWriter,
  tick: Tick,
): void {
  releaseExpiredReservations(world, tick);
  const lifecycleStore = world.stores.get<Lifecycle>('lifecycle');
  const planStore = world.stores.get<ConstructionPlan>('constructionPlan');
  const progressStore = world.stores.get<ConstructionProgress>('constructionProgress');
  const removed: EntityId[] = [];
  for (const entity of lifecycleStore.ids()) {
    const state = lifecycleOf(world, entity);
    const progress = progressStore.get(entity);
    if (state === 'cancelled') {
      if (progress !== undefined) releaseReservations(world, tx, progress.reservations);
      events.emit({
        type: 'ConstructionCancelled',
        subjects: [entity],
        owner: null,
        location: null,
        payload: { entity },
      });
      removed.push(entity);
      continue;
    }
    if (state !== 'active' && state !== 'disabled' && state !== 'blocked') continue;
    if (progress?.deconstructAt == null || tick < progress.deconstructAt) continue;
    const plan = planStore.get(entity);
    if (plan !== undefined) completeDeconstruction(world, tx, entity, plan, progress);
    setLifecycle(world, entity, 'deconstructed');
    events.emit({
      type: 'EntityDeconstructed',
      subjects: [entity],
      owner: null,
      location: null,
      payload: { entity },
    });
    removed.push(entity);
  }
  for (const entity of removed) removeEntity(world, entity);
  if (removed.length > 0) world.caches.dirty = true;
  compactStores(world);
  // Timer instances of removed subjects are deleted (TDS-14.3).
  if (removed.length > 0) {
    const alive = (subject: EntityId): boolean => {
      for (const kind of world.stores.kinds) {
        if (world.stores.get(kind).has(subject)) return true;
      }
      return false;
    };
    const timers = world.timers.timers.filter((timer) => alive(timer.subject));
    if (timers.length !== world.timers.timers.length) world.timers = { timers };
  }
}
