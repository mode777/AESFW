/**
 * `policies/spatial` — spatial policies (ARCH-11).
 *
 * Source: ARCH-11
 */
export {
  ABSTRACT_CAPACITY_POLICY_ID,
  abstractCapacityPolicy,
  resolveSpatialPolicy,
} from './abstract-capacity.js';
export type { CapacitySummary, PlacementResult, SpatialPolicy } from './types.js';
