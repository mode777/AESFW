/**
 * `sim/transitions` — tier transitions (GDD-13, CONT-6.15).
 *
 * Source: GDD-13, CONT-6.15
 */
export {
  declineTransitionsOf,
  emptyResidencePolicyOf,
  residenceCapacityOf,
  transitionDefinitionOf,
  transitionDefinitionsOf,
} from './definitions.js';
export { advanceTransitions, startTransition } from './engine.js';
export { residenceFromDefinition } from './instantiate.js';
export type {
  EmptyResidencePolicy,
  PopulationConversion,
  RefundPolicy,
  RunningTransition,
  TransitionCost,
  TransitionDefinition,
  TransitionTrigger,
} from './types.js';
