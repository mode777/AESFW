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
export type NeedType = 'resource_consumption' | 'resource_availability';

/** A resolved need specification. */
export type NeedSpec = {
  readonly need: DefinitionHandle;
  readonly category: DefinitionHandle;
  readonly type: NeedType;
  readonly resource: DefinitionHandle;
  readonly quantityPerPopulationPerTick: Int;
  readonly measurementWindowTicks: Int;
  readonly targetRatio: Int;
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
