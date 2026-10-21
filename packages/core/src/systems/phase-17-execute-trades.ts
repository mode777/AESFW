/**
 * Phase 17 — executeTrades (TDS-11.1). Registered no-op until its owning roadmap row.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase17ExecuteTrades: SystemDescriptor = {
  phase: 17,
  name: 'executeTrades',
  reads: [],
  writes: [],
  run: () => undefined,
};
