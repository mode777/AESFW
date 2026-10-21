/**
 * The `abstract_capacity` spatial policy (GDD-6.1, ARCH-11). A location is a
 * single capacity bin; occupancy is the location's authoritative `used` amount.
 *
 * Source: GDD-6.1, ARCH-11, CONT-6.4
 */
import type { Int } from '../../fx/index.js';
import type { EntityId } from '../../ids/index.js';
import { locationOf } from '../../sim/location.js';
import type { Location } from '../../sim/location.js';
import type { World } from '../../world/types.js';
import type { CapacitySummary, PlacementResult, SpatialPolicy } from './types.js';

/** The string id of the abstract-capacity policy. */
export const ABSTRACT_CAPACITY_POLICY_ID = 'framework.spatial.abstract_capacity';

const setUsed = (world: World, location: EntityId, used: Int): void => {
  const store = world.stores.get<Location>('location');
  const component = store.get(location);
  if (component === undefined) return;
  store.set(location, { ...component, used });
};

const capacity = (world: World, location: EntityId): CapacitySummary => {
  const component = locationOf(world, location);
  if (component === undefined) return { total: 0, used: 0, free: 0 };
  const free = component.capacity - component.used;
  return { total: component.capacity, used: component.used, free: free < 0 ? 0 : free };
};

const validatePlacement = (world: World, location: EntityId, footprint: Int): PlacementResult => {
  const component = locationOf(world, location);
  if (component === undefined) return { ok: false, code: 'unknown_location' };
  if (!component.active) return { ok: false, code: 'location_inactive' };
  if (component.used + footprint > component.capacity) {
    return { ok: false, code: 'insufficient_capacity' };
  }
  return { ok: true };
};

const add = (world: World, location: EntityId, footprint: Int): void => {
  const component = locationOf(world, location);
  if (component === undefined) return;
  setUsed(world, location, component.used + footprint);
};

const remove = (world: World, location: EntityId, footprint: Int): void => {
  const component = locationOf(world, location);
  if (component === undefined) return;
  const next = component.used - footprint;
  setUsed(world, location, next < 0 ? 0 : next);
};

/** The abstract-capacity spatial policy. */
export const abstractCapacityPolicy: SpatialPolicy = {
  id: ABSTRACT_CAPACITY_POLICY_ID,
  capacity,
  validatePlacement,
  add,
  remove,
};

const POLICIES: Readonly<Record<string, SpatialPolicy>> = {
  [ABSTRACT_CAPACITY_POLICY_ID]: abstractCapacityPolicy,
};

/** Resolves a spatial policy by id, or `null` when unknown. */
export function resolveSpatialPolicy(id: string): SpatialPolicy | null {
  return POLICIES[id] ?? null;
}
