/**
 * Phase 10 — allocateThroughput (TDS-11.1, GDD-15.1). Allocates each
 * throughput-limited location's pool with `alloc-v1` and publishes the
 * per-requester throttle.
 *
 * Source: TDS-11.1, GDD-15.1, ARCH-5.2, TDS-6.3
 */
import { allocateThroughput } from '../sim/internal-logistics/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase10AllocateThroughput: SystemDescriptor = {
  phase: 10,
  name: 'allocateThroughput',
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
    'throughputAllocation',
    'capabilityProvider',
  ],
  writes: ['throughputPool', 'throughputAllocation'],
  run: (ctx) => {
    allocateThroughput(ctx.world, ctx.registry, ctx.scratch, ctx.events);
  },
};
