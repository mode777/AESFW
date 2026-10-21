/**
 * Phase 05 — rebuildCapabilitySupply (TDS-11.1, ARCH-13). Clears the per-tick
 * pools and aggregates provider rates; the pools live in scratch and are
 * consumed by phase 06.
 *
 * Source: TDS-11.1, ARCH-13, GDD-14.1
 */
import { buildCapabilitySupply } from '../sim/capabilities/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase05RebuildCapabilitySupply: SystemDescriptor = {
  phase: 5,
  name: 'rebuildCapabilitySupply',
  reads: ['capabilityProvider'],
  writes: [],
  run: (ctx) => {
    ctx.scratch.values.set('capabilitySupply', buildCapabilitySupply(ctx.world));
  },
};
