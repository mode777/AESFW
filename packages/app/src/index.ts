/**
 * Public entry point of `@aesfw/app`, the application layer.
 *
 * Sessions, the command gateway, and revision semantics are delivered by
 * roadmap row 2.2; projections, read models, and persistence follow in rows
 * 2.3–2.5.
 */
export const APP_PACKAGE_ID = '@aesfw/app' as const;

export { advance, createSession, submitCommand } from './session/index.js';
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
