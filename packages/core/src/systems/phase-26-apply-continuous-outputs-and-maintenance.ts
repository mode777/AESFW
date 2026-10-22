/**
 * Phase 26 — applyContinuousOutputsAndMaintenance (TDS-11.1). Applies the
 * population capability outputs and income, then charges entity maintenance.
 *
 * Source: TDS-11.1, GDD-11.3, GDD-20.1, GDD-20.2, TDS-6.4
 */
import { applyMaintenance } from '../sim/economy/index.js';
import { applyPopulationOutputs } from '../sim/population/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase26ApplyContinuousOutputsAndMaintenance: SystemDescriptor = {
  phase: 26,
  name: 'applyContinuousOutputsAndMaintenance',
  reads: [
    'residence',
    'populationGroup',
    'satisfaction',
    'maintenance',
    'owner',
    'enabled',
    'lifecycle',
    'producer',
  ],
  writes: ['capabilityProvider', 'accumulators', 'owners', 'ledger', 'maintenance', 'enabled'],
  run: (ctx) => {
    applyPopulationOutputs(ctx.world, ctx.registry, ctx.tx, ctx.events);
    applyMaintenance(ctx.world, ctx.tick, ctx.tx, ctx.events);
  },
};
