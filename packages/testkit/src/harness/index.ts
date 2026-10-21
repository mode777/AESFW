/**
 * The `@aesfw/testkit` harness: world builder, invariant checker, and
 * determinism harnesses (VER-5.2, VER-6, VER-8.1).
 */
export { world } from './world-builder.js';
export type { WorldBuilder } from './world-builder.js';
export {
  content,
  definitionById,
  definitionsOf,
  diagnosticCodes,
  expectContentOk,
  expectNoDiagnostics,
} from './content-builder.js';
export type { ContentBuilder, ContentBuildResult } from './content-builder.js';
export { checkInvariants, expectInvariants } from './invariants.js';
export type { InvariantFinding } from './invariants.js';
export {
  cloneRun,
  doubleRun,
  saveContinue,
  expectHashStable,
  expectSameState,
} from './harnesses.js';
export type { DeterminismReport, DoubleRunOptions } from './harnesses.js';
