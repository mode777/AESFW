/**
 * M2 read-model DTOs (PIC-10.1–10.3, TDS-22). Read models are derived values
 * computed over the world and never written back as authority.
 *
 * Source: PIC-10.1, PIC-10.2, PIC-10.3, TDS-22
 */
import type { InventoryDto, ProductionDto, ThroughputDto } from './snapshot.js';
import type { WireId, WireInt } from './scalars.js';

/** Maintenance summary for an entity (PIC-10.1). */
export interface MaintenanceDto {
  readonly amount: WireInt;
  readonly policy: string;
}

/** Residence summary for an entity (PIC-10.1). */
export interface ResidenceDto {
  readonly population: WireInt;
  readonly satisfaction: WireInt;
  readonly band: string;
}

/** Entity detail read model (PIC-10.1). */
export interface EntityDetailDto {
  readonly entity_id: WireInt;
  readonly definition_id: WireId;
  readonly lifecycle: string;
  readonly location_id?: WireInt;
  readonly owner_id?: WireId;
  readonly enabled: boolean;
  readonly paused_by_deficit?: boolean;
  readonly available_commands: readonly string[];
  readonly production?: ProductionDto;
  readonly block_reasons: readonly string[];
  readonly maintenance?: MaintenanceDto;
  readonly inventories?: readonly InventoryDto[];
  readonly residence?: ResidenceDto;
}

/** Location summary read model (PIC-10.2). */
export interface LocationSummaryDto {
  readonly entity_id: WireInt;
  readonly knowledge: string;
  readonly active: boolean;
  readonly region?: string;
  readonly inventory_totals?: Readonly<Record<string, WireInt>>;
  readonly population_by_tier?: Readonly<Record<string, WireInt>>;
  readonly capability_totals?: Readonly<Record<string, WireInt>>;
  readonly throughput?: ThroughputDto;
  readonly entity_counts?: Readonly<Record<string, WireInt>>;
  readonly connections?: readonly string[];
  readonly net_rates?: Readonly<Record<string, WireInt>>;
}

/** Need breakdown read model (PIC-10.3). */
export interface NeedBreakdownDto {
  readonly entity_id: WireInt;
  readonly need_id: WireId;
  readonly demand: WireInt;
  readonly delivered: WireInt;
  readonly fulfillment: WireInt;
  readonly category: WireId;
  readonly category_result: WireInt;
  readonly satisfaction?: WireInt;
  readonly band?: string;
}

/** One consuming tier of the planning read model (PIC-10.5). */
export interface PlanningTierDto {
  readonly tier_id: WireId;
  readonly per_capita_permille: WireInt;
  readonly supported: WireInt;
  readonly consuming_population: WireInt;
  readonly coverage_permille: WireInt;
}

/** One scope (owner or location) of the planning read model (PIC-10.5). */
export interface PlanningScopeDto {
  readonly scope: 'owner' | 'location';
  readonly location_id?: WireInt;
  readonly net_per_tick: WireInt;
  readonly tiers: readonly PlanningTierDto[];
}

/** One chain stage of the planning read model (PIC-10.5). */
export interface PlanningChainStageDto {
  readonly definition_id: WireId;
  readonly count: WireInt;
  readonly ratio: WireInt;
  readonly output_per_tick: WireInt;
  readonly footprint: WireInt;
  readonly maintenance_per_interval: WireInt;
  readonly capability_demand: Readonly<Record<string, WireInt>>;
}

/** One resource chain of the planning read model (PIC-10.5). */
export interface PlanningChainDto {
  readonly resource_id: WireId;
  readonly output_per_tick: WireInt;
  readonly stages: readonly PlanningChainStageDto[];
}

/** The planning read model (PIC-10.5). */
export interface PlanningDto {
  readonly owner_id: WireId;
  readonly resources: readonly {
    readonly resource_id: WireId;
    readonly scopes: readonly PlanningScopeDto[];
  }[];
  readonly chains: readonly PlanningChainDto[];
}
