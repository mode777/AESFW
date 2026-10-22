/**
 * Placement runtime shapes (GDD-18.2, PIC-12.1). A `PlacementSpec` is the
 * resolved placement data of an entity definition; a `PlacementQuery` asks
 * whether a definition may be placed at a location and transform; the result
 * is `ok` or an ordered list of typed rejection reasons.
 *
 * Source: GDD-18.2, PIC-12.1, CONT-6.8, TDS-10.1
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';
import type { Footprint, LogicalTransform } from '../spatial.js';
import type { World } from '../../world/types.js';

/** A resolved placement specification (CONT-6.8, GDD-18.2). */
export type PlacementSpec = {
  readonly capacityCost: Int;
  readonly footprint: Footprint | null;
  readonly conditions: readonly DefinitionHandle[];
};

/** A read-only placement request (PIC-12.1, TDS-10.1). */
export type PlacementQuery = {
  readonly definition: DefinitionHandle;
  readonly location: EntityId;
  readonly transform: LogicalTransform;
};

/** A placement rejection reason code (GDD-18.2, TDS-16.3). */
export type PlacementReasonCode =
  | 'unknown_definition'
  | 'unknown_location'
  | 'location_inactive'
  | 'out_of_bounds'
  | 'not_buildable'
  | 'occupied'
  | 'insufficient_capacity'
  | 'placement_condition_failed';

/** A typed placement rejection reason with machine-readable arguments. */
export type PlacementReason = {
  readonly code: PlacementReasonCode;
  readonly arguments: Readonly<Record<string, string | number | boolean>>;
};

/** The outcome of a placement validation (PIC-12.1). */
export type PlacementResult =
  { readonly ok: true } | { readonly ok: false; readonly reasons: readonly PlacementReason[] };

/**
 * Evaluates a content condition against a subject without importing content
 * (design D4). The application layer supplies the implementation; core tests
 * inject a stub.
 */
export type PlacementConditionEvaluator = (
  world: World,
  condition: DefinitionHandle,
  subject: EntityId,
) => boolean;
