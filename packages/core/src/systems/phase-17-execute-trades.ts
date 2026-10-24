/**
 * Phase 17 — executeTrades (TDS-11.1, GDD-17.4). Executes the staged buy and
 * sell actions against the exchange price state: price limits and side
 * enablement, one atomic trade per action, deterministic ordering, elasticity
 * recording, and the `Traded` event.
 *
 * Source: TDS-11.1, GDD-17.4, ARCH-14.4, ARCH-14.5
 */
import { executeTrades } from '../sim/transport/trades.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase17ExecuteTrades: SystemDescriptor = {
  phase: 17,
  name: 'executeTrades',
  reads: [
    'movement',
    'cargo',
    'transportOrder',
    'transportAssignment',
    'stationCursor',
    'exchangeRef',
    'owner',
  ],
  writes: [
    'cargo',
    'stationCursor',
    'exchanges',
    'owners',
    'ledger',
    'transportAssignment',
    'route',
    'movement',
  ],
  run: (ctx) => {
    executeTrades(ctx.world, ctx.registry, ctx.tx, ctx.scratch, ctx.events, ctx.tick);
  },
};
