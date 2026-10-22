/**
 * `session` — the pure application session and command gateway (TDS-18).
 *
 * Source: TDS-18
 */
export { advance, createSession, submitCommand } from './session.js';
export { buildConditionEvaluator, placementQuery, placementTransformOf } from './placement.js';
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
} from './types.js';
