/**
 * Full snapshot and incremental delta DTOs (PIC-9, TDS-22). Field names follow
 * 04 verbatim. Sub-DTOs owned by later milestones are optional so that v1
 * accepts snapshots that omit fields a later row fills in.
 *
 * Source: PIC-9, TDS-22
 */
import type { JsonObject, WireId, WireInt } from './scalars.js';

/** Per-owner balance summary (PIC-9.1, PIC-10.6). */
export interface OwnerBalanceDto {
  readonly revenue_per_interval: WireInt;
  readonly expenses_per_interval: WireInt;
  readonly net_per_interval: WireInt;
  readonly deficit_paused_entities: readonly WireInt[];
  readonly revenue_by_source?: Readonly<Record<string, WireInt>>;
  readonly expenses_by_source?: Readonly<Record<string, WireInt>>;
  readonly idle_paying_entities?: readonly WireInt[];
}

/** An owner entry in a snapshot (PIC-9.1). */
export interface OwnerDto {
  readonly owner_id: WireId;
  readonly resources: Readonly<Record<string, WireInt>>;
  readonly balance?: OwnerBalanceDto;
}

/** Discovered location properties (PIC-9.1, PIC-9.3). */
export interface LocationPropertiesDto {
  readonly tags: readonly string[];
  readonly region?: string;
  readonly values?: Readonly<Record<string, WireInt>>;
}

/** Location throughput summary (PIC-9.1, PIC-10.2). */
export interface ThroughputDto {
  readonly capacity: WireInt;
  readonly requested: WireInt;
  readonly throttle_permille: WireInt;
}

/** One inventory entry in a snapshot (PIC-9.1). */
export interface InventoryEntryDto {
  readonly resource_id: WireId;
  readonly stored: WireInt;
  readonly reserved: WireInt;
  readonly capacity?: WireInt;
  readonly purpose_locks?: readonly string[];
}

/** An inventory in a snapshot (PIC-9.1). */
export interface InventoryDto {
  readonly inventory_id: WireInt;
  readonly entries: readonly InventoryEntryDto[];
}

/** Grid geometry of a grid-policy location (PIC-9.1, CONT-6.4). */
export interface LocationGridDto {
  readonly width: WireInt;
  readonly height: WireInt;
  /** Packed cell indices (`y * width + x`) that are not buildable, ascending. */
  readonly blocked: readonly WireInt[];
}

/** A location entry in a snapshot (PIC-9.1). */
export interface LocationDto {
  readonly entity_id: WireInt;
  readonly definition_id?: WireId;
  readonly owner_id?: WireId;
  readonly knowledge?: string;
  readonly active?: boolean;
  readonly properties?: LocationPropertiesDto;
  readonly throughput?: ThroughputDto;
  readonly inventories?: readonly InventoryDto[];
  readonly connections?: readonly string[];
  readonly grid?: LocationGridDto;
}

/** A rectangular footprint in cells, before orientation (PIC-9.1). */
export interface FootprintDto {
  readonly width: WireInt;
  readonly height: WireInt;
}

/** Logical placement of an entity (PIC-9.1). */
export interface SpatialDto {
  readonly logical_position: readonly [WireInt, WireInt];
  readonly orientation: WireInt;
  readonly footprint?: FootprintDto;
}

/** Connectivity node state of an entity (PIC-9.1, PIC-10.2). */
export interface ConnectivityDto {
  readonly role: string;
  readonly network: WireId;
  readonly connected: boolean;
}

/** Production state of an entity (PIC-9.1, PIC-10.1). */
export interface ProductionDto {
  readonly recipe_id?: WireId;
  readonly state: string;
  readonly progress: WireInt;
  readonly progress_scale: WireInt;
  readonly block_reasons: readonly string[];
}

/** An entity entry in a snapshot (PIC-9.1). */
export interface EntityDto {
  readonly entity_id: WireInt;
  readonly definition_id?: WireId;
  readonly location_id?: WireInt;
  readonly revision?: WireInt;
  readonly lifecycle?: string;
  readonly spatial?: SpatialDto;
  readonly connectivity?: ConnectivityDto;
  readonly production?: ProductionDto;
}

/** A full snapshot (PIC-9.1). */
export interface SnapshotDto {
  readonly session_id: WireId;
  readonly tick: WireInt;
  readonly revision: WireInt;
  readonly configuration_checksum: string;
  readonly owners: readonly OwnerDto[];
  readonly locations: readonly LocationDto[];
  readonly entities: readonly EntityDto[];
}

/** One entity field update in a delta (PIC-9.2). */
export interface EntityUpdateDto {
  readonly entity_id: WireInt;
  readonly component: string;
  readonly fields: JsonObject;
}

/** One inventory update in a delta (PIC-9.2). */
export interface InventoryUpdateDto {
  readonly inventory_id: WireInt;
  readonly resource_id: WireId;
  readonly stored: WireInt;
  readonly reserved: WireInt;
}

/** An incremental delta (PIC-9.2). */
export interface SnapshotDeltaDto {
  readonly session_id: WireId;
  readonly from_revision: WireInt;
  readonly to_revision: WireInt;
  readonly tick: WireInt;
  readonly entity_updates: readonly EntityUpdateDto[];
  readonly inventory_updates: readonly InventoryUpdateDto[];
  readonly owner_updates?: readonly OwnerDto[];
}
