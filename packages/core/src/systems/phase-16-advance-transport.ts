/**
 * Phase 16 — advanceTransport (TDS-11.1, ARCH-14.1–14.3). Advances every
 * moving transport unit by one tick, emits `TransportArrived` on arrival, and
 * records the tick's arrivals for later transport phases.
 *
 * Source: TDS-11.1, ARCH-14.1, ARCH-14.2, ARCH-14.3
 */
import { advanceTransport } from '../sim/transport/route.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase16AdvanceTransport: SystemDescriptor = {
  phase: 16,
  name: 'advanceTransport',
  reads: ['movement', 'location'],
  writes: ['movement'],
  run: (ctx) => {
    advanceTransport(ctx.world, ctx.scratch, ctx.events);
  },
};
