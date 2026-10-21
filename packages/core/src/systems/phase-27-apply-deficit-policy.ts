/**
 * Phase 27 — applyDeficitPolicy (TDS-11.1). Registered no-op until its owning roadmap row.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase27ApplyDeficitPolicy: SystemDescriptor = {
  phase: 27,
  name: 'applyDeficitPolicy',
  reads: [],
  writes: [],
  run: () => undefined,
};
