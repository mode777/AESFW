/**
 * Phase 14 — planInternalLogistics (TDS-11.1, GDD-15.2). Plans a path to the
 * current station for every assigned transport unit.
 *
 * Source: TDS-11.1, GDD-15.2, ARCH-14.3, ARCH-14.4
 */
import { planTransportOrders } from '../sim/transport/orders.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase14PlanInternalLogistics: SystemDescriptor = {
  phase: 14,
  name: 'planInternalLogistics',
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
  ],
  writes: ['movement', 'route', 'stationCursor', 'transportAssignment'],
  run: (ctx) => {
    planTransportOrders(ctx.world);
  },
};
