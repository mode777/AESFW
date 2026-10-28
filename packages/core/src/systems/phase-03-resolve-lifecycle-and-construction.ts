/**
 * Phase 3 — resolveLifecycleAndConstruction (TDS-11.1). Reconciles the
 * operational lifecycle states, reserves construction costs atomically, and
 * advances construction under the plan's commit policy (GDD-18.1).
 *
 * Source: TDS-11.1, ARCH-5.2, GDD-9.1, GDD-18.1
 */
import { resolveConstruction } from '../sim/construction/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase03ResolveLifecycleAndConstruction: SystemDescriptor = {
  phase: 3,
  name: 'resolveLifecycleAndConstruction',
  reads: [
    'lifecycle',
    'constructionPlan',
    'constructionProgress',
    'enabled',
    'producer',
    'inventory',
  ],
  writes: [
    'lifecycle',
    'definition',
    'constructionProgress',
    'inventory',
    'ledger',
    // Materializing a completed entity writes its behavioural components
    // (amendment A15).
    'resourceSource',
    'producer',
    'capabilityConsumer',
    'residence',
    'populationGroup',
    'growth',
    'modifierSet',
    'connectivityNode',
    'maintenance',
    'cargo',
    'movement',
    'handling',
  ],
  run: (ctx) => {
    resolveConstruction(ctx.world, ctx.tx, ctx.events, ctx.tick, ctx.entityMaterializer);
  },
};
