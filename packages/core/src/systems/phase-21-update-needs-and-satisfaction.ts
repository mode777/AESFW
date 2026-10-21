/**
 * Phase 21 — updateNeedsAndSatisfaction (TDS-11.1, GDD-12.3–12.5). Computes
 * fulfillment, category results, and residence satisfaction.
 *
 * Source: TDS-11.1, GDD-12.3, GDD-12.5
 */
import { updateSatisfaction } from '../sim/needs/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase21UpdateNeedsAndSatisfaction: SystemDescriptor = {
  phase: 21,
  name: 'updateNeedsAndSatisfaction',
  reads: ['residence', 'needStates'],
  writes: ['satisfaction'],
  run: (ctx) => {
    updateSatisfaction(ctx.world);
  },
};
