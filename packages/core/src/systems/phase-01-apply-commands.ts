/**
 * Phase 1 — applyCommands (TDS-11.1). Registered no-op until its owning roadmap row.
 *
 * Source: TDS-11.1, ARCH-5.2
 */
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase01ApplyCommands: SystemDescriptor = {
  phase: 1,
  name: 'applyCommands',
  reads: [],
  writes: [],
  run: () => undefined,
};
