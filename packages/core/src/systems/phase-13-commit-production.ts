/**
 * Phase 13 — commitProduction (TDS-11.1, ARCH-6.2). Commits inputs, deposits
 * outputs, and releases capacity as one atomic composite (INV-15).
 *
 * Source: TDS-11.1, ARCH-6.2, GDD-10.4, INV-15
 */
import { commitProduction } from '../sim/production/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase13CommitProduction: SystemDescriptor = {
  phase: 13,
  name: 'commitProduction',
  reads: ['producer', 'resourceSource', 'inventory'],
  writes: ['producer', 'resourceSource', 'inventory', 'ledger'],
  run: (ctx) => {
    commitProduction(ctx.world, ctx.tx, ctx.scratch);
  },
};
