/**
 * Phase 6 — allocateCapabilities (TDS-11.1). Registered no-op until its owning roadmap row.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase06AllocateCapabilities: SystemDescriptor = {
  phase: 6,
  name: 'allocateCapabilities',
  reads: [],
  writes: [],
  run: () => undefined,
};
