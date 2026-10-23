/**
 * Phase 24 — advanceTransitions (TDS-11.1, GDD-13). Completes due tier
 * transitions, starts automatic and decline triggers, and applies
 * empty-residence policies.
 *
 * Source: TDS-11.1, GDD-13, ARCH-5.2
 */
import { advanceTransitions } from '../sim/transitions/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase24AdvanceTransitions: SystemDescriptor = {
  phase: 24,
  name: 'advanceTransitions',
  reads: ['residence', 'populationGroup', 'transition', 'bandState', 'definition', 'growth'],
  writes: [
    'residence',
    'populationGroup',
    'transition',
    'definition',
    'growth',
    'constructionProgress',
    'lifecycle',
    'inventory',
    'ledger',
  ],
  run: (ctx) => {
    advanceTransitions(
      ctx.world,
      ctx.registry,
      ctx.tx,
      ctx.events,
      ctx.tick,
      ctx.conditionEvaluator,
    );
  },
};
