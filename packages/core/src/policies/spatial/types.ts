/**
 * The spatial-policy abstraction (ARCH-11). The economic simulation depends on
 * this interface, never on a specific geometry. Policy output is authoritative
 * and deterministic.
 *
 * Source: GDD-6.1, ARCH-11
 */
import type { Int } from '../../fx/index.js';
import type { EntityId } from '../../ids/index.js';
import type {
  DistanceMetric,
  Footprint,
  GridPosition,
  LogicalTransform,
} from '../../sim/spatial.js';
import type { World } from '../../world/types.js';

/** Total, used, and free capacity of a location (ARCH-11). */
export interface CapacitySummary {
  readonly total: Int;
  readonly used: Int;
  readonly free: Int;
}

/** The outcome of a count-based placement validation. */
export type PlacementResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: 'unknown_location' | 'location_inactive' | 'insufficient_capacity';
    };

/** The outcome of a grid placement validation (ARCH-11). */
export type GridPlacementResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code:
        | 'unknown_location'
        | 'location_inactive'
        | 'out_of_bounds'
        | 'not_buildable'
        | 'occupied'
        | 'insufficient_capacity';
    };

/** A spatial policy implementation (ARCH-11). */
export interface SpatialPolicy {
  readonly id: string;
  capacity(world: World, location: EntityId): CapacitySummary;
  validatePlacement(world: World, location: EntityId, footprint: Int): PlacementResult;
  add(world: World, location: EntityId, footprint: Int): void;
  remove(world: World, location: EntityId, footprint: Int): void;
}

/** The grid spatial policy (ARCH-11, TDS-13). */
export interface GridSpatialPolicy extends SpatialPolicy {
  readonly id: 'framework.spatial.grid';
  /** True when the cell is inside the grid and not blocked. */
  buildable(world: World, location: EntityId, position: GridPosition): boolean;
  /** Validates a footprint at a transform (mask, occupancy, and capacity). */
  canPlace(
    world: World,
    location: EntityId,
    footprint: Footprint,
    transform: LogicalTransform,
  ): GridPlacementResult;
  /** Places an entity, updating `used` and the occupancy cache. */
  place(
    world: World,
    entity: EntityId,
    footprint: Footprint,
    transform: LogicalTransform,
  ): GridPlacementResult;
  /** Removes an entity, updating `used` and the occupancy cache. */
  unplace(world: World, entity: EntityId): void;
  /** Distance between two placed entities under a metric, or `null`. */
  distance(world: World, a: EntityId, b: EntityId, metric: DistanceMetric): Int | null;
  /** True when the provider covers the consumer within `radius` cells. */
  covers(world: World, provider: EntityId, consumer: EntityId, radius: Int): boolean;
}
