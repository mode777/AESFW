/**
 * `policies/spatial` — spatial policies (ARCH-11).
 *
 * Source: ARCH-11
 */
export { ABSTRACT_CAPACITY_POLICY_ID, abstractCapacityPolicy } from './abstract-capacity.js';
export { GRID_POLICY_ID, gridPolicy, resolveGridSpatialPolicy } from './grid.js';
export { resolveSpatialPolicy } from './registry.js';
export type {
  CapacitySummary,
  GridPlacementResult,
  GridSpatialPolicy,
  PlacementResult,
  SpatialPolicy,
} from './types.js';
