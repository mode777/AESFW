/**
 * Phase 09 — collectThroughputRequests (TDS-11.1, GDD-15.1). Collects every
 * movement request of the tick into scratch for phase 10.
 *
 * Source: TDS-11.1, GDD-15.1, ARCH-5.2, TDS-11.3
 */
import { collectThroughputRequests } from '../sim/internal-logistics/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase09CollectThroughputRequests: SystemDescriptor = {
  phase: 9,
  name: 'collectThroughputRequests',
  reads: [
    'producer',
    'resourceSource',
    'residence',
    'needStates',
    'location',
    'enabled',
    'lifecycle',
    'owners',
    'throughputPool',
    'movement',
    'transportAssignment',
    'transportOrder',
    'stationCursor',
    'cargo',
    'inventory',
    'handling',
  ],
  writes: [],
  run: (ctx) => {
    collectThroughputRequests(ctx.world, ctx.scratch);
  },
};
