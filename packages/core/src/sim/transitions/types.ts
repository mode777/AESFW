/**
 * Tier-transition runtime shapes (GDD-13, CONT-6.15). The `transition`
 * component records a running advancement or decline; the definition is
 * resolved from content on demand.
 *
 * Source: GDD-13, CONT-6.15
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, Tick } from '../../ids/index.js';

/** A transition trigger mode (GDD-13.2). */
export type TransitionTrigger = 'manual_command' | 'automatic' | 'scheduled' | 'condition_duration';

/** A population conversion policy (GDD-13.3). */
export type PopulationConversion =
  | 'retain_count'
  | 'retain_count_clamped'
  | 'clamp_to_target_capacity'
  | 'retain_occupancy_ratio'
  | 'set_fixed'
  | 'apply_multiplier';

/** A transition cost line (CONT-6.15). */
export type TransitionCost = {
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
};

/** A cost refund policy (GDD-13.3). */
export type RefundPolicy =
  | { readonly policy: 'none' }
  | { readonly policy: 'fraction'; readonly fraction: Int }
  | { readonly policy: 'resources'; readonly resources: readonly TransitionCost[] };

/** A resolved transition definition (CONT-6.15). */
export type TransitionDefinition = {
  readonly transition: DefinitionHandle;
  readonly sourceTier: DefinitionHandle;
  readonly targetTier: DefinitionHandle;
  readonly trigger: TransitionTrigger;
  readonly condition: DefinitionHandle | null;
  readonly costs: readonly TransitionCost[];
  readonly refund: RefundPolicy;
  readonly durationTicks: Int;
  readonly conversion: {
    readonly population: PopulationConversion;
    readonly populationCount: Int;
    readonly populationMultiplier: Int;
    readonly entityDefinition: DefinitionHandle | null;
  };
};

/** A running transition; the `transition` component (GDD-9.3, CONT-6.15). */
export type RunningTransition = {
  readonly transition: DefinitionHandle;
  readonly sourceTier: DefinitionHandle;
  readonly targetTier: DefinitionHandle;
  readonly startedTick: Tick;
  readonly completesAt: Tick;
};

/** An empty-residence policy (GDD-9.3). */
export type EmptyResidencePolicy =
  | { readonly policy: 'retain' }
  | { readonly policy: 'revert'; readonly definition: DefinitionHandle }
  | { readonly policy: 'decay'; readonly delayTicks: Int };
