/**
 * Phase 23 — updatePopulation (TDS-11.1, GDD-11.4). Applies growth and decline
 * from satisfaction and capacity.
 *
 * Source: TDS-11.1, GDD-11.4, INV-07
 */
import { updatePopulation } from '../sim/population/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase23UpdatePopulation: SystemDescriptor = {
  phase: 23,
  name: 'updatePopulation',
  reads: ['growth', 'populationGroup', 'satisfaction'],
  writes: ['populationGroup', 'accumulators'],
  run: (ctx) => {
    updatePopulation(ctx.world, ctx.events);
  },
};
