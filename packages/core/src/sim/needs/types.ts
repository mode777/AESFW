/**
 * Need component shapes (GDD-12.1–12.5). Resolved need and category
 * specifications live on the residence; runtime demand and windows live in the
 * `needStates` component.
 *
 * Source: GDD-12.1, GDD-12.3, GDD-12.4, GDD-12.5
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle } from '../../ids/index.js';

/** The need supplier type (GDD-12.2). */
export type NeedType =
  | 'resource_consumption'
  | 'resource_availability'
  | 'service_capacity'
  | 'spatial_coverage'
  | 'state_query';

/** A resolved need specification. */
export type NeedSpec = {
  readonly need: DefinitionHandle;
  readonly category: DefinitionHandle;
  readonly type: NeedType;
  readonly resource: DefinitionHandle;
  readonly quantityPerPopulationPerTick: Int;
  readonly measurementWindowTicks: Int;
  readonly targetRatio: Int;
  /** The service of a `service_capacity` or `spatial_coverage` need. */
  readonly service?: DefinitionHandle;
  /** The distinct-provider requirement of a `spatial_coverage` need. */
  readonly requiredDistinctProviders?: Int;
  /** The condition of a `state_query` need. */
  readonly condition?: DefinitionHandle;
};

/** A need-category evaluation mode (GDD-12.3). */
export type CategoryMode = 'all' | 'any' | 'count' | 'weighted_score' | 'average' | 'minimum';

/** A weighted category member. */
export type CategoryMember = {
  readonly need: DefinitionHandle;
  readonly weight: Int;
};

/** A resolved need-category specification. */
export type CategorySpec = {
  readonly category: DefinitionHandle;
  readonly mode: CategoryMode;
  readonly requiredScore: Int;
  readonly members: readonly CategoryMember[];
};

/** A residence's satisfaction aggregation mode (GDD-12.5). */
export type SatisfactionAggregation = 'average' | 'minimum';

/** Per-need runtime state. */
export type NeedRuntime = {
  readonly need: DefinitionHandle;
  readonly demanded: Int;
  readonly window: readonly Int[];
};

/** The need states of a residence. */
export type NeedStates = {
  readonly needs: readonly NeedRuntime[];
};

/** A category's fulfillment. */
export type CategoryResult = {
  readonly category: DefinitionHandle;
  readonly fulfillment: Int;
};

/** A residence's satisfaction. */
export type Satisfaction = {
  readonly z: Int;
  readonly categories: readonly CategoryResult[];
};

/** True when `value` is a need-states component. */
export function isNeedStates(value: unknown): value is NeedStates {
  return typeof value === 'object' && value !== null && Array.isArray((value as NeedStates).needs);
}

/** A service-provider runtime entry (GDD-9.6, CONT-6.8); a `modifierSet` entry. */
export type ServiceProvider = {
  readonly kind: 'service_provider';
  readonly mode: 'coverage' | 'capacity';
  readonly service: DefinitionHandle;
  /** Effective coverage radius in cells; present for coverage providers. */
  readonly radiusCells?: Int;
  /** The generated capability of a capacity provider. */
  readonly capability?: DefinitionHandle;
  readonly quantityPerTick?: Int;
};
