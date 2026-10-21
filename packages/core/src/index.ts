/**
 * Public entry point of `@aesfw/core`, the simulation kernel.
 *
 * `fx` (checked fixed-point arithmetic) and the invariant-violation error
 * types are delivered by roadmap row 0.3. Deterministic primitives (0.4),
 * world state (0.5), and the tick pipeline (0.6) follow.
 */
export const CORE_PACKAGE_ID = '@aesfw/core' as const;

export * as fx from './fx/index.js';
export { InvariantViolation, ArithmeticOverflow } from './errors/invariant-violation.js';
