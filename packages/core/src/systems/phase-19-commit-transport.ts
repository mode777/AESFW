/**
 * Phase 19 — commitTransport (TDS-11.1, GDD-15.2). Commits the staged
 * loading and unloading transfers through the transaction writer.
 *
 * Source: TDS-11.1, GDD-15.2, GDD-15.4
 */
import { commitTransportOrders } from '../sim/transport/orders.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase19CommitTransport: SystemDescriptor = {
  phase: 19,
  name: 'commitTransport',
  reads: ['movement', 'cargo', 'inventory'],
  writes: ['cargo', 'inventory', 'ledger'],
  run: (ctx) => {
    commitTransportOrders(ctx.world, ctx.tx, ctx.scratch, ctx.events);
  },
};
