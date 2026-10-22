/**
 * `sim/production` — resource sources, the producer state machine, and phases
 * 07 and 11–13 (GDD-9.4, GDD-9.5, GDD-10).
 *
 * Source: GDD-9.4, GDD-9.5, GDD-10
 */
export { advanceSource } from './sources.js';
export type { SourceTick } from './sources.js';
export {
  evaluatePreconditions,
  evaluateSourcePreconditions,
  staticBlockReasons,
} from './preconditions.js';
export { reserveProductionIO } from './reserve.js';
export { advanceProcesses } from './advance.js';
export { commitProduction } from './commit.js';
export { effectiveDuration, planInputs, planOutputs, recipeOf } from './plan.js';
export { PENDING_OUTPUT_KEY } from './types.js';
export type {
  BlockReason,
  ItemAmount,
  Producer,
  ProducerState,
  RecipeMode,
  RecipeSpec,
  ResourceSource,
  SourceConditionEvaluator,
  SourceOutput,
  SourcePolicy,
  SourceSlotBinding,
  WorkingAreaClaim,
} from './types.js';
