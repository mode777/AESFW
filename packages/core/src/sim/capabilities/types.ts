/**
 * Capability component shapes (GDD-14.1, ARCH-13). Recomputed capabilities are
 * never stored in inventories; providers contribute a per-tick rate and
 * consumers request an amount under an allocation model.
 *
 * Source: GDD-14.1, GDD-14.2, ARCH-13
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';

/** The scope a capability pool lives in. */
export type CapabilityScope = 'location' | 'owner' | 'global';

/** The allocation models of GDD-14.2. */
export type AllocationModel = 'binary' | 'proportional' | 'priority' | 'weighted';

/** A capability provider component. */
export type CapabilityProvider = {
  readonly capability: DefinitionHandle;
  readonly scope: CapabilityScope;
  readonly location: EntityId | null;
  readonly rate: Int;
};

/** A capability consumer component. */
export type CapabilityConsumer = {
  readonly capability: DefinitionHandle;
  readonly substitutes: readonly DefinitionHandle[];
  readonly scope: CapabilityScope;
  readonly location: EntityId | null;
  readonly model: AllocationModel;
  readonly priority: number;
  readonly weight: Int;
  readonly request: Int;
};

/** A published capability allocation. */
export type CapabilityAllocation = {
  readonly capability: DefinitionHandle;
  readonly granted: Int;
  readonly shortage: Int;
};

/** A capability pool aggregate. */
export type CapabilityPool = {
  readonly scope: CapabilityScope;
  readonly location: EntityId | null;
  readonly capability: DefinitionHandle;
  readonly supply: Int;
};

/** The per-tick pools, keyed by `(scope, location, capability)`. */
export type CapabilitySupply = ReadonlyMap<string, CapabilityPool>;

/** The key of a capability pool. */
export function poolKey(
  scope: CapabilityScope,
  location: EntityId | null,
  capability: DefinitionHandle,
): string {
  return `${scope}:${location ?? 0}:${capability}`;
}
