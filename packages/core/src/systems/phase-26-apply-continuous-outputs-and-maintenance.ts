/**
 * Phase 26 — applyContinuousOutputsAndMaintenance (TDS-11.1). Applies the
 * population capability outputs and credits population income; maintenance
 * arrives with `add-maintenance` (4.2).
 *
 * Source: TDS-11.1, GDD-11.3, GDD-20.2, TDS-6.4
 */
import { applyPopulationOutputs } from '../sim/population/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase26ApplyContinuousOutputsAndMaintenance: SystemDescriptor = {
  phase: 26,
  name: 'applyContinuousOutputsAndMaintenance',
  reads: ['residence', 'populationGroup', 'satisfaction'],
  writes: ['capabilityProvider', 'accumulators', 'owners', 'ledger'],
  run: (ctx) => {
    applyPopulationOutputs(ctx.world, ctx.registry, ctx.tx, ctx.events);
  },
};
