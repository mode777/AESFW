/**
 * Phase 4 — rebuildSpatialCaches (TDS-11.1). Rebuilds the derived spatial cache
 * from the authoritative `location`, `transform`, and `footprint` state when it
 * is dirty (TDS-8.4).
 *
 * Source: TDS-11.1, TDS-8.4, ARCH-5.2, INV-20
 */
import { rebuildSpatialCaches } from '../sim/spatial.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase04RebuildSpatialCaches: SystemDescriptor = {
  phase: 4,
  name: 'rebuildSpatialCaches',
  reads: ['location', 'transform', 'footprint'],
  writes: [],
  run: (ctx) => {
    if (ctx.world.caches.dirty || ctx.world.caches.spatial === undefined) {
      rebuildSpatialCaches(ctx.world);
    }
  },
};
