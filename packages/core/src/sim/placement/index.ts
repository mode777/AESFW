/**
 * `sim/placement` — the generic placement predicates, the read-only
 * `evaluatePlacement` query, and the placement and construction command
 * application (GDD-18.2, PIC-12.1, ARCH-7.3).
 *
 * Source: GDD-18.2, PIC-12.1, ARCH-7.3, TDS-10.1
 */
export {
  applyCancelEntityPlan,
  applyCommitConstruction,
  applyDeconstructEntity,
  applyPlaceEntityPlan,
} from './apply.js';
export type { PlaceEntityOutcome } from './apply.js';
export {
  constructionPlanOf,
  entityComponentsOf,
  initiallyEnabledOf,
  isKnownEntityDefinition,
  placementSpecOf,
} from './definition.js';
export { evaluatePlacementPredicates } from './predicates.js';
export { evaluatePlacement } from './query.js';
export type {
  PlacementConditionEvaluator,
  PlacementQuery,
  PlacementReason,
  PlacementReasonCode,
  PlacementResult,
  PlacementSpec,
} from './types.js';
