/**
 * Phase 11 — reserveProductionIO (TDS-11.1, GDD-4.3). Reserves inputs and
 * output capacity atomically; a partial start does not exist.
 *
 * Source: TDS-11.1, GDD-4.3, GDD-10.2
 */
import { reserveProductionIO } from '../sim/production/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase11ReserveProductionIO: SystemDescriptor = {
  phase: 11,
  name: 'reserveProductionIO',
  reads: ['producer', 'capabilityAllocation', 'inventory'],
  writes: ['producer', 'inventory', 'ledger'],
  run: (ctx) => {
    reserveProductionIO(ctx.world, ctx.tx);
  },
};
