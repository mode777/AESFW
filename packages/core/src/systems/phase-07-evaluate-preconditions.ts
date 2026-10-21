/**
 * Phase 07 — evaluatePreconditions (TDS-11.1, GDD-10.3). Rebuilds the static
 * block reasons of every producer.
 *
 * Source: TDS-11.1, GDD-10.3
 */
import { evaluatePreconditions } from '../sim/production/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase07EvaluatePreconditions: SystemDescriptor = {
  phase: 7,
  name: 'evaluatePreconditions',
  reads: ['producer', 'enabled', 'location', 'owners'],
  writes: ['producer', 'ledger'],
  run: (ctx) => {
    evaluatePreconditions(ctx.world, ctx.tx);
  },
};
