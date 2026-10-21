/**
 * Phase 18 — resolveArrivals (TDS-11.1). Registered no-op until its owning roadmap row.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase18ResolveArrivals: SystemDescriptor = {
  phase: 18,
  name: 'resolveArrivals',
  reads: [],
  writes: [],
  run: () => undefined,
};
