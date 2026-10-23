/**
 * Throttle helpers shared by movement phases (TDS-11.3 rule 3). The helper is
 * kept separate from pool construction so movement modules do not depend on
 * phase 09/10 collection code.
 *
 * Source: GDD-15.1, TDS-11.3
 */
import { mulDiv } from '../../fx/index.js';
import type { Int } from '../../fx/index.js';
import type { EntityId } from '../../ids/index.js';
import type { World } from '../../world/types.js';
import type { ThroughputAllocation } from './types.js';

/** The throttle permille of a requester, or `1000` when unbounded (TDS-11.3). */
export function throttlePermilleOf(world: World, entity: EntityId): Int {
  const allocation = world.stores.get<ThroughputAllocation>('throughputAllocation').get(entity);
  return allocation?.throttlePermille ?? 1000;
}

/** Scales a planned movement by the granted throttle (TDS-11.3 rule 3). */
export function throttleQuantity(quantity: Int, throttlePermille: Int): Int {
  if (throttlePermille >= 1000) return quantity;
  return mulDiv(quantity, throttlePermille, 1000, 'floor');
}
