/**
 * Construction lifecycle runtime shapes (GDD-9.1, GDD-18.1, GDD-18.3). The
 * generic lifecycle state machine, the resolved construction plan, the mutable
 * progress, and the deconstruction policy. Plans and progress are plain
 * canonical data stored in the `constructionPlan` and `constructionProgress`
 * components.
 *
 * Source: GDD-9.1, GDD-18.1, GDD-18.3, CONT-6.8
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId, ReservationId, Tick } from '../../ids/index.js';

/** The generic lifecycle states of GDD-9.1. */
export type LifecycleState =
  | 'planned'
  | 'awaiting_resources'
  | 'constructing'
  | 'active'
  | 'disabled'
  | 'blocked'
  | 'deconstructed'
  | 'cancelled';

/** The `lifecycle` component value. */
export type Lifecycle = { readonly lifecycle: LifecycleState };

/** When construction costs are consumed (GDD-18.1, CONT-6.8). */
export type CommitPolicy = 'start' | 'continuous' | 'completion';

/** A resolved construction cost or return line. */
export type ConstructionCost = {
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
};

/** A deconstruction policy (GDD-18.3). */
export type DeconstructPolicy = {
  readonly duration: Int;
  readonly returns: readonly ConstructionCost[];
  readonly cancelReservations: boolean;
};

/** A resolved construction plan. */
export type ConstructionPlan = {
  readonly duration: Int;
  readonly costs: readonly ConstructionCost[];
  readonly commitPolicy: CommitPolicy;
  readonly inventory: EntityId | null;
  readonly deconstruct: DeconstructPolicy | null;
};

/**
 * Mutable construction state. `reservations` is parallel to `plan.costs` in
 * ascending reservation-ID order; `committed[i]` is the quantity already
 * consumed from `costs[i]`.
 */
export type ConstructionProgress = {
  readonly progress: Int;
  readonly startedTick: Tick | null;
  readonly reservations: readonly ReservationId[];
  readonly committed: readonly Int[];
  readonly deconstructAt: Tick | null;
};
