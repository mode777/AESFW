/**
 * Internal-logistics throughput shapes (GDD-6.6, GDD-15.1, TDS-8.3). A
 * throughput-limited location publishes one pool; every requester publishes
 * one allocation for the tick. Requests are per-tick scratch data and are
 * never saved.
 *
 * Source: GDD-6.6, GDD-15.1, TDS-8.3, TDS-11.2
 */
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle, EntityId } from '../../ids/index.js';

/** The throughput-limited inventory-access policy ID. */
export const THROUGHPUT_LIMITED_POLICY = 'framework.inventory.throughput_limited';

/** A location throughput pool (TDS-8.3). */
export type ThroughputPool = {
  readonly policy: string;
  readonly baseCapacity: Int;
  readonly baseThroughputCapability: DefinitionHandle | null;
  readonly capacity: Int;
  readonly requested: Int;
  readonly throttlePermille: Int;
};

/** One requester's throughput allocation for the tick (TDS-8.3). */
export type ThroughputAllocation = {
  readonly location: EntityId;
  readonly requested: Int;
  readonly granted: Int;
  readonly throttlePermille: Int;
};

/** One throughput request collected in phase 09. */
export type ThroughputRequest = {
  readonly entity: EntityId;
  readonly location: EntityId;
  readonly quantity: Int;
};

/** The scratch key holding phase 09's requests. */
export const THROUGHPUT_REQUESTS_KEY = 'throughputRequests';

/** A storage-provider runtime entry (GDD-9.7, CONT-6.8). */
export type StorageProvider = {
  readonly kind: 'storage_provider';
  readonly inventory: EntityId;
  readonly location: EntityId | null;
  readonly capacityTotal: Int;
  readonly capacityPerResource: Int;
  readonly throughput: Int;
};
