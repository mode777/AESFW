/**
 * Phase 25 — evaluateUnlocks (TDS-11.1, GDD-19). Recomputes every owner's
 * unlocked targets through the injected unlock system.
 *
 * Source: TDS-11.1, GDD-19, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase25EvaluateUnlocks: SystemDescriptor = {
  phase: 25,
  name: 'evaluateUnlocks',
  reads: ['owners'],
  writes: ['owners'],
  run: (ctx) => {
    ctx.unlockSystem?.update(ctx);
  },
};
