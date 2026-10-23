/**
 * Public entry point of `@aesfw/app`, the application layer.
 *
 * Sessions, the command gateway, and revision semantics are delivered by
 * roadmap row 2.2; projections, read models, and persistence follow in rows
 * 2.3–2.5.
 */
export const APP_PACKAGE_ID = '@aesfw/app' as const;

export {
  advance,
  buildConditionEvaluator,
  createSession,
  placementQuery,
  placementTransformOf,
  submitCommand,
} from './session/index.js';
export type {
  AcceptedCommandRecord,
  AdvanceResult,
  HashCheckpoint,
  SessionCommandOutcome,
  SessionDiagnostic,
  SessionOptions,
  SessionSettings,
  SessionState,
  SubmitResult,
} from './session/index.js';
export { diffProjection, project } from './projections/index.js';
export {
  definitionMetadata,
  entityDetail,
  locationSummary,
  needBreakdown,
  planningMetrics,
} from './readmodels/index.js';
export { save, load, FRAMEWORK_VERSION, HASH_ALGORITHM } from './persistence/index.js';
export type { SaveDocument, SaveHeader, SaveSessionState } from './persistence/index.js';
export { instantiateContentEntities, instantiateWorldContent } from './content/instantiate.js';
