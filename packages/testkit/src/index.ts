/**
 * Public entry point of `@aesfw/testkit`, the test infrastructure.
 *
 * The world builder, invariant checker, and determinism harnesses are
 * delivered by roadmap row 0.7. The content-driven builder and query helpers
 * arrive with `add-testkit-content-builders` (1.5).
 */
export const TESTKIT_PACKAGE_ID = '@aesfw/testkit' as const;

export { world } from './harness/world-builder.js';
export type { WorldBuilder } from './harness/world-builder.js';
export {
  content,
  definitionById,
  definitionsOf,
  diagnosticCodes,
  expectContentOk,
  expectNoDiagnostics,
} from './harness/content-builder.js';
export type { ContentBuilder, ContentBuildResult } from './harness/content-builder.js';
export { checkInvariants, expectInvariants } from './harness/invariants.js';
export type { InvariantFinding } from './harness/invariants.js';
export {
  cloneRun,
  doubleRun,
  saveContinue,
  expectHashStable,
  expectSameState,
} from './harness/harnesses.js';
export type { DeterminismReport, DoubleRunOptions } from './harness/harnesses.js';
