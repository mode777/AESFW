/**
 * Phase 4 — rebuildSpatialCaches (TDS-11.1, ARCH-5.2). Rebuilds the derived
 * spatial and connectivity caches from the authoritative `location`,
 * `locationHub`, `transform`, `footprint`, and `connectivityNode` state
 * (TDS-8.4).
 *
 * Source: TDS-11.1, TDS-8.4, ARCH-5.2, INV-20
 */
import { rebuildConnectivityCaches } from '../sim/connectivity.js';
import { rebuildSpatialCaches } from '../sim/spatial.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase04RebuildSpatialCaches: SystemDescriptor = {
  phase: 4,
  name: 'rebuildSpatialCaches',
  reads: ['location', 'locationHub', 'transform', 'footprint', 'connectivityNode'],
  writes: [],
  run: (ctx) => {
    rebuildSpatialCaches(ctx.world);
    rebuildConnectivityCaches(ctx.world);
  },
};
