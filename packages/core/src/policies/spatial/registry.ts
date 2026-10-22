/**
 * The spatial-policy registry (ARCH-11). Resolves a policy by its string id.
 *
 * Source: ARCH-11
 */
import { ABSTRACT_CAPACITY_POLICY_ID, abstractCapacityPolicy } from './abstract-capacity.js';
import { GRID_POLICY_ID, gridPolicy } from './grid.js';
import type { SpatialPolicy } from './types.js';

const POLICIES: Readonly<Record<string, SpatialPolicy>> = {
  [ABSTRACT_CAPACITY_POLICY_ID]: abstractCapacityPolicy,
  [GRID_POLICY_ID]: gridPolicy,
};

/** Resolves a spatial policy by id, or `null` when unknown. */
export function resolveSpatialPolicy(id: string): SpatialPolicy | null {
  return POLICIES[id] ?? null;
}
