/**
 * `sim/population` — residences, population groups, and capability outputs
 * (GDD-11, TDS-6.4).
 *
 * Source: GDD-11, TDS-6.4
 */
export { applyPopulationOutputs } from './outputs.js';
export { readCarry, writeCarry } from './accumulators.js';
export { updatePopulation } from './growth.js';
export type { Growth, GrowthCondition, GrowthStep } from './growth.js';
export { isPopulationGroup, isResidence } from './types.js';
export type { PopulationGroup, PopulationOutput, Residence } from './types.js';

export { bandIndexFor, bandTableOf, updateBands } from './bands.js';
export type { BandEffects, BandMultiplier, BandState, BandTable } from './bands.js';
export { resolveGrowthPolicy } from './growth.js';
