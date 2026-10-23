/**
 * Transport runtime shapes (GDD-9.8, GDD-15.4, TDS-8.3). Cargo compartments are
 * authoritative; movement and handling are configuration copied from the
 * transport-unit definition at instantiation.
 *
 * Source: GDD-9.8, GDD-15.4, TDS-8.3
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId, StringId } from '../../ids/index.js';

/** The cargo compartment policy (GDD-15.4). */
export type CargoCompartmentPolicy = 'unrestricted' | 'typed_slots' | 'per_resource';

/** One typed cargo slot. `resource` is `null` when the slot is empty. */
export type CargoSlot = {
  readonly resource: DefinitionHandle | null;
  readonly quantity: Int;
};

/** One cargo entry of an unrestricted or per-resource compartment. */
export type CargoEntry = {
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
};

/** A transport unit's cargo component (GDD-15.4, INV-16). */
export type Cargo = {
  readonly policy: CargoCompartmentPolicy;
  readonly slotCapacity: Int;
  readonly slots: readonly CargoSlot[];
  readonly entries: readonly CargoEntry[];
  /** Accepted resources; empty means every resource. */
  readonly accepts: readonly DefinitionHandle[];
};

/** A transport unit's movement configuration (ARCH-14.1, ARCH-14.2). */
export type TransportMovement = {
  readonly speedPermille: Int;
  readonly mode: 'physical' | 'abstract';
  readonly allowedConnectionTags: readonly StringId[];
  /** The current location; set at instantiation and updated on arrival. */
  readonly location?: EntityId;
  /** The planned location path, when moving. */
  readonly path?: readonly EntityId[];
  /** The connection ids between consecutive path locations. */
  readonly connectionIds?: readonly StringId[];
  /** The index of the current path leg. */
  readonly step?: Int;
  /** Progress on the current leg in ticks. */
  readonly progress?: Int;
};

/** A transport unit's handling configuration (GDD-15.4). */
export type TransportHandling = {
  readonly loadingRatePerTick: Int;
  readonly unloadingRatePerTick: Int;
};

/** The scratch key holding transport arrivals of the tick. */
export const TRANSPORT_ARRIVALS_KEY = 'transportArrivals';

/** One transport arrival recorded by phase 16. */
export type TransportArrival = {
  readonly unit: EntityId;
  readonly location: EntityId;
};
