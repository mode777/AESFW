/**
 * Phase 16 — advanceTransport (TDS-11.1, ARCH-14.1–14.4). Advances moving
 * units, then stages loading and unloading for docked units.
 *
 * Source: TDS-11.1, ARCH-14.1, ARCH-14.2, ARCH-14.3, ARCH-14.4, GDD-15.2
 */
import { advanceTransport } from '../sim/transport/route.js';
import { advanceTransportOrders } from '../sim/transport/orders.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase16AdvanceTransport: SystemDescriptor = {
  phase: 16,
  name: 'advanceTransport',
  reads: [
    'movement',
    'location',
    'transportAssignment',
    'transportOrder',
    'stationCursor',
    'route',
    'cargo',
    'inventory',
    'handling',
    'throughputAllocation',
  ],
  writes: ['movement', 'stationCursor', 'route', 'transportAssignment'],
  run: (ctx) => {
    advanceTransport(ctx.world, ctx.scratch, ctx.events);
    advanceTransportOrders(ctx.world, ctx.scratch, ctx.events);
  },
};
