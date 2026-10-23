/**
 * Phase 27 — applyDeficitPolicy (TDS-11.1). Applies every compiled deficit
 * policy to every owner: pauses maintenance payers while the balance is in
 * deficit until the net rate is non-negative, and resumes automatically in
 * reverse pause order when the resume condition holds (GDD-20.3).
 *
 * Source: TDS-11.1, GDD-3.7, GDD-20.3, ARCH-5.2
 */
import { applyDeficitPolicy } from '../sim/economy/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase27ApplyDeficitPolicy: SystemDescriptor = {
  phase: 27,
  name: 'applyDeficitPolicy',
  reads: [
    'maintenance',
    'owner',
    'definition',
    'residence',
    'populationGroup',
    'satisfaction',
    'enabled',
    'lifecycle',
    'producer',
  ],
  writes: ['owners'],
  run: (ctx) => {
    applyDeficitPolicy(ctx.world, ctx.registry, ctx.events);
  },
};
