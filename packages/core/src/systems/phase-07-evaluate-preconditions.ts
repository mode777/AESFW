/**
 * Phase 07 — evaluatePreconditions (TDS-11.1, GDD-10.3, GDD-9.5). Rebuilds the
 * static block reasons of every producer and resource source, and assigns
 * source slot bindings and working-area claims.
 *
 * Source: TDS-11.1, GDD-10.3, GDD-9.5, ARCH-5.2
 */
import { evaluatePreconditions, evaluateSourcePreconditions } from '../sim/production/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase07EvaluatePreconditions: SystemDescriptor = {
  phase: 7,
  name: 'evaluatePreconditions',
  reads: [
    'producer',
    'resourceSource',
    'sourceSlotBinding',
    'workingArea',
    'enabled',
    'location',
    'connectivityNode',
    'owners',
  ],
  writes: ['producer', 'resourceSource', 'sourceSlotBinding', 'workingArea', 'ledger'],
  run: (ctx) => {
    evaluatePreconditions(ctx.world, ctx.tx);
    evaluateSourcePreconditions(ctx.world, ctx.conditionEvaluator);
  },
};
