/**
 * Phase 03 — construction start, progress, and cost commitment (GDD-18.1,
 * ARCH-5.2, TDS-11.1). Reconciles the operational lifecycle states, reserves a
 * plan's costs atomically, advances construction by one tick per run, commits
 * the reserved costs under the plan's commit policy, and activates the entity
 * on completion.
 *
 * Source: GDD-9.1, GDD-18.1, CONT-6.8, ARCH-6.2, TDS-11.1
 */
import { mulDiv } from '../../fx/index.js';
import type { EntityId, ReservationId, Tick } from '../../ids/index.js';
import type { EventWriter } from '../../events/event-writer.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { lifecycleOf, reconcileOperationalStates, setLifecycle } from './lifecycle.js';
import { commitReservations, reserveConstructionCosts } from './reserve.js';
import type { ConstructionPlan, ConstructionProgress } from './types.js';

const commitContinuous = (
  world: World,
  tx: TransactionWriter,
  plan: ConstructionPlan,
  reservations: readonly ReservationId[],
  committed: readonly number[],
  elapsed: number,
): readonly number[] => {
  const next = [...committed];
  tx.atomic((builder) => {
    for (let index = 0; index < plan.costs.length; index += 1) {
      const cost = plan.costs[index];
      const reservation = reservations[index];
      if (cost === undefined || reservation === undefined) continue;
      const target = mulDiv(cost.quantity, elapsed, plan.duration, 'floor');
      const delta = target - (next[index] ?? 0);
      if (delta > 0) {
        builder.commit(reservation, delta);
        next[index] = target;
      }
    }
  });
  return next;
};

const complete = (
  world: World,
  tx: TransactionWriter,
  events: EventWriter,
  entity: EntityId,
  plan: ConstructionPlan,
  progress: ConstructionProgress,
): void => {
  commitReservations(world, tx, progress.reservations);
  world.stores.get<ConstructionProgress>('constructionProgress').set(entity, {
    ...progress,
    committed: plan.costs.map((cost) => cost.quantity),
    reservations: [],
  });
  setLifecycle(world, entity, 'active');
  events.emit({
    type: 'ConstructionCompleted',
    subjects: [entity],
    owner: null,
    location: null,
    payload: { entity },
  });
};

/**
 * Runs phase 03 over the construction plans in ascending entity ID
 * (GDD-18.1, TDS-11.1). The run that starts construction also counts as the
 * first construction tick.
 *
 * Source: GDD-9.1, GDD-18.1, ARCH-5.2, TDS-11.1
 */
export function resolveConstruction(
  world: World,
  tx: TransactionWriter,
  events: EventWriter,
  tick: Tick,
): void {
  reconcileOperationalStates(world);
  const planStore = world.stores.get<ConstructionPlan>('constructionPlan');
  const progressStore = world.stores.get<ConstructionProgress>('constructionProgress');
  for (const entity of planStore.ids()) {
    const plan = planStore.get(entity);
    if (plan === undefined) continue;
    const lifecycle = lifecycleOf(world, entity);
    if (lifecycle === 'planned' || lifecycle === 'awaiting_resources') {
      const reserved = reserveConstructionCosts(world, tx, entity, plan);
      if (!reserved.ok) {
        setLifecycle(world, entity, 'awaiting_resources');
        continue;
      }
      let reservations: readonly ReservationId[] = [...reserved.value];
      let committed: readonly number[] = plan.costs.map(() => 0);
      if (plan.commitPolicy === 'start') {
        commitReservations(world, tx, reservations);
        committed = plan.costs.map((cost) => cost.quantity);
        reservations = [];
      }
      progressStore.set(entity, {
        progress: 0,
        startedTick: tick,
        reservations,
        committed,
        deconstructAt: null,
      });
      setLifecycle(world, entity, 'constructing');
      events.emit({
        type: 'ConstructionStarted',
        subjects: [entity],
        owner: null,
        location: null,
        payload: { entity },
      });
    } else if (lifecycle !== 'constructing') {
      continue;
    }
    const progress = progressStore.get(entity);
    if (progress === undefined) continue;
    const elapsed = progress.progress + 1;
    const committed =
      plan.commitPolicy === 'continuous' && plan.duration > 0
        ? commitContinuous(world, tx, plan, progress.reservations, progress.committed, elapsed)
        : progress.committed;
    if (elapsed >= plan.duration) {
      complete(world, tx, events, entity, plan, { ...progress, progress: elapsed, committed });
    } else {
      progressStore.set(entity, { ...progress, progress: elapsed, committed });
    }
  }
}
