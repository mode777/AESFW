/**
 * The spatial-policy abstraction (ARCH-11). The economic simulation depends on
 * this interface, never on a specific geometry. Policy output is authoritative
 * and deterministic.
 *
 * Source: GDD-6.1, ARCH-11
 */
import type { Int } from '../../fx/index.js';
import type { EntityId } from '../../ids/index.js';
import type { World } from '../../world/types.js';

/** Total, used, and free capacity of a location (ARCH-11). */
export interface CapacitySummary {
  readonly total: Int;
  readonly used: Int;
  readonly free: Int;
}

/** The outcome of a placement validation. */
export type PlacementResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: 'unknown_location' | 'location_inactive' | 'insufficient_capacity';
    };

/** A spatial policy implementation (ARCH-11). */
export interface SpatialPolicy {
  readonly id: string;
  capacity(world: World, location: EntityId): CapacitySummary;
  validatePlacement(world: World, location: EntityId, footprint: Int): PlacementResult;
  add(world: World, location: EntityId, footprint: Int): void;
  remove(world: World, location: EntityId, footprint: Int): void;
}
