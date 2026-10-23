/**
 * Phase 20 — allocateServicesAndConsumeNeeds (TDS-11.1, GDD-12.2). Delivers
 * need resources from accessible inventories, allocates service capacity, and
 * evaluates coverage and state-query needs.
 *
 * Source: TDS-11.1, GDD-12.2, ARCH-12
 */
import { deliverNeeds } from '../sim/needs/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase20AllocateServicesAndConsumeNeeds: SystemDescriptor = {
  phase: 20,
  name: 'allocateServicesAndConsumeNeeds',
  reads: [
    'residence',
    'needStates',
    'inventory',
    'throughputAllocation',
    'modifierSet',
    'transform',
    'enabled',
    'location',
  ],
  writes: ['needStates', 'inventory', 'ledger'],
  run: (ctx) => {
    deliverNeeds(ctx.world, ctx.tx, ctx.events, ctx.conditionEvaluator);
  },
};
