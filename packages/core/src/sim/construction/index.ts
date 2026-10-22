/**
 * `sim/construction` — the generic entity lifecycle, construction plans and
 * progress, atomic cost reservation, the commit policies, cancellation, and
 * deconstruction (GDD-9.1, GDD-18.1, GDD-18.3). Phase 03 starts and advances
 * construction; phase 30 finalizes lifecycle and expired reservations.
 *
 * Source: GDD-9.1, GDD-18.1, GDD-18.3, CONT-6.8, TDS-11.1
 */
export {
  LIFECYCLE_STATES,
  LIFECYCLE_TRANSITIONS,
  canTransition,
  lifecycleOf,
  reconcileOperationalStates,
  setLifecycle,
} from './lifecycle.js';
export { constructionPlanOf, constructionProgressOf, createConstructionPlan } from './plan.js';
export { commitReservations, releaseReservations, reserveConstructionCosts } from './reserve.js';
export { resolveConstruction } from './start.js';
export { requestCancellation, requestDeconstruction } from './seams.js';
export { compactStores, finalizeLifecycle, removeEntity } from './finalize.js';
export type {
  CommitPolicy,
  ConstructionCost,
  ConstructionPlan,
  ConstructionProgress,
  DeconstructPolicy,
  Lifecycle,
  LifecycleState,
} from './types.js';
