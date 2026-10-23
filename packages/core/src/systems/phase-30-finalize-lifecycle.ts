/**
 * Phase 30 — finalizeLifecycle (TDS-11.1). Releases expired reservations,
 * completes cancellation and deconstruction, removes finalized entities, and
 * compacts every component store (INV-24).
 *
 * Source: TDS-11.1, TDS-12.3, TDS-8.2, GDD-9.1, GDD-18.3, INV-24
 */
import { COMPONENT_KINDS } from '../world/component-store.js';
import { finalizeLifecycle } from '../sim/construction/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase30FinalizeLifecycle: SystemDescriptor = {
  phase: 30,
  name: 'finalizeLifecycle',
  reads: ['ledger', 'lifecycle', 'constructionPlan', 'constructionProgress', 'inventory', 'timers'],
  writes: [...COMPONENT_KINDS, 'ledger', 'timers'],
  run: (ctx) => {
    finalizeLifecycle(ctx.world, ctx.tx, ctx.events, ctx.tick);
  },
};
