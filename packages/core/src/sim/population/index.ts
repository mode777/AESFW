/**
 * `sim/population` — residences, population groups, and capability outputs
 * (GDD-11, TDS-6.4).
 *
 * Source: GDD-11, TDS-6.4
 */
export { applyPopulationOutputs } from './outputs.js';
export { readCarry, writeCarry } from './accumulators.js';
export { isPopulationGroup, isResidence } from './types.js';
export type { PopulationGroup, PopulationOutput, Residence } from './types.js';
