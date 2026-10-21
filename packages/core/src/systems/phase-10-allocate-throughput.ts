/**
 * Phase 10 — allocateThroughput (TDS-11.1). Registered no-op until its owning roadmap row.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase10AllocateThroughput: SystemDescriptor = {
  phase: 10,
  name: 'allocateThroughput',
  reads: [],
  writes: [],
  run: () => undefined,
};
