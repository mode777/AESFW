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

/** The transport-order mode (GDD-15.5). */
export type TransportOrderMode = 'route' | 'explore' | 'establish' | 'trade';

/** An action at a station (GDD-15.2). */
export type TransportAction = 'load' | 'unload' | 'buy' | 'sell';

/** A transport failure policy (GDD-15.7). */
export type FailurePolicy = 'skip' | 'wait' | 'retry' | 'return' | 'fail' | 'retain';

/** The failure policy keys of an order (CONT-9). */
export type FailureKey =
  | 'origin_unavailable'
  | 'destination_unavailable'
  | 'path_unavailable'
  | 'cargo_cannot_unload'
  | 'exchange_limit_not_met'
  | 'establishment_target_occupied';

/** A per-failure policy table. */
export type FailurePolicies = Readonly<Record<FailureKey, FailurePolicy>>;

/** A quantity rule (GDD-15.3). Modes beyond the basic three arrive with 6.5. */
export type QuantityRule =
  | { readonly mode: 'fixed'; readonly quantity: Int }
  | { readonly mode: 'up_to_capacity' }
  | { readonly mode: 'all' }
  | { readonly mode: 'excess_above'; readonly quantity: Int }
  | { readonly mode: 'deficit_below'; readonly quantity: Int }
  | { readonly mode: 'maintain_origin_minimum'; readonly quantity: Int }
  | { readonly mode: 'maintain_destination_target'; readonly quantity: Int }
  | { readonly mode: 'priority_list'; readonly quantities: readonly Int[] };

/** One action of a station. */
export type StationAction = {
  readonly resource: DefinitionHandle;
  readonly action: TransportAction;
  readonly rule: QuantityRule;
  readonly priceLimit?: Int;
};

/** One station of a route. */
export type StationSpec = {
  readonly endpoint: EntityId;
  readonly actions: readonly StationAction[];
};

/** A runtime transport order. */
export type TransportOrder = {
  readonly mode: TransportOrderMode;
  readonly stations: readonly StationSpec[];
  readonly pathPolicy: 'shortest_stable';
  readonly repeat: boolean;
  readonly retryIntervalTicks: Int;
  readonly failurePolicies: FailurePolicies;
};

/** A transport order as submitted by a command, before entity allocation. */
export type TransportOrderSpec = TransportOrder;

/** The station cursor of an assigned unit (ARCH-14.4). */
export type StationCursor = {
  readonly station: Int;
  readonly action: Int;
  readonly handled: Int;
  readonly target: Int;
  readonly started: boolean;
  /** The last failure that is keeping the action waiting, if any. */
  readonly failure?: FailureKey;
};

/** A unit's assignment to an order. */
export type TransportAssignment = {
  readonly order: EntityId | null;
};

/** A unit's planned route state for the current station. */
export type RouteState = {
  readonly order: EntityId;
  readonly station: Int;
  readonly path: readonly EntityId[];
};

/** One staged handling or trade transfer. A trade carries `exchange` and no inventory. */
export type PendingTransportTransfer = {
  readonly unit: EntityId;
  readonly order: EntityId;
  readonly action: TransportAction;
  readonly resource: DefinitionHandle;
  readonly quantity: Int;
  readonly inventory: EntityId | null;
  readonly exchange: EntityId | null;
};

/** The scratch key holding phase 16's staged handling transfers. */
export const TRANSPORT_HANDLING_KEY = 'transportHandling';

/** The scratch key holding transport arrivals of the tick. */
export const TRANSPORT_ARRIVALS_KEY = 'transportArrivals';

/** One transport arrival recorded by phase 16. */
export type TransportArrival = {
  readonly unit: EntityId;
  readonly location: EntityId;
};
