/**
 * Phase 12 — advanceProcesses (TDS-11.1, GDD-10.2). Advances producers and
 * computes source output.
 *
 * Source: TDS-11.1, GDD-10.2, GDD-10.4
 */
import { advanceProcesses } from '../sim/production/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase12AdvanceProcesses: SystemDescriptor = {
  phase: 12,
  name: 'advanceProcesses',
  reads: ['producer', 'resourceSource'],
  writes: ['producer', 'resourceSource'],
  run: (ctx) => {
    advanceProcesses(ctx.world, ctx.scratch);
  },
};
