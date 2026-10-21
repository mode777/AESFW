/**
 * Phase 08 — calculatePopulationDemand (TDS-11.1, GDD-12.4). Computes each
 * residence's need demand from the previous tick's population.
 *
 * Source: TDS-11.1, GDD-12.4
 */
import { calculatePopulationDemand } from '../sim/needs/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase08CalculatePopulationDemand: SystemDescriptor = {
  phase: 8,
  name: 'calculatePopulationDemand',
  reads: ['residence', 'populationGroup', 'needStates'],
  writes: ['needStates'],
  run: (ctx) => {
    calculatePopulationDemand(ctx.world, ctx.events);
  },
};
