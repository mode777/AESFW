/**
 * Phase 26 — applyContinuousOutputsAndMaintenance (TDS-11.1). Applies the
 * population capability outputs; maintenance arrives with
 * `add-maintenance` (4.2).
 *
 * Source: TDS-11.1, GDD-11.3, TDS-6.4
 */
import { applyPopulationOutputs } from '../sim/population/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase26ApplyContinuousOutputsAndMaintenance: SystemDescriptor = {
  phase: 26,
  name: 'applyContinuousOutputsAndMaintenance',
  reads: ['residence', 'populationGroup'],
  writes: ['capabilityProvider', 'accumulators'],
  run: (ctx) => {
    applyPopulationOutputs(ctx.world, ctx.events);
  },
};
