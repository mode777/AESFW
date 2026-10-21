/**
 * Public entry point of `@aesfw/core`, the simulation kernel.
 *
 * `fx` (checked fixed-point arithmetic) and the invariant-violation error
 * types are delivered by roadmap row 0.3; `det` (canonical JSON, hashing,
 * RNG, ordering), branded identifiers, and `Result` by row 0.4. World state
 * (0.5) and the tick pipeline (0.6) follow.
 */
export const CORE_PACKAGE_ID = '@aesfw/core' as const;

export * as fx from './fx/index.js';
export * as det from './det/index.js';
export * as ids from './ids/index.js';
export * as world from './world/index.js';
export { InvariantViolation, ArithmeticOverflow } from './errors/invariant-violation.js';
export type { Diagnostic } from './errors/diagnostic.js';
export { createEmptyRegistry } from './registry/types.js';
export type { DefinitionType, Registry } from './registry/types.js';
export { ok, err } from './result.js';
export type { Result } from './result.js';
