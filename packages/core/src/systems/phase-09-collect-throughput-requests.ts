/**
 * Phase 9 — collectThroughputRequests (TDS-11.1). Registered no-op until its owning roadmap row.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase09CollectThroughputRequests: SystemDescriptor = {
  phase: 9,
  name: 'collectThroughputRequests',
  reads: [],
  writes: [],
  run: () => undefined,
};
