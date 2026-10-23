/**
 * Pure client selectors (REF-12.3, REF-12.4). Every number the client shows is
 * produced here from a projection or read model; selectors do no DOM work and
 * are the unit-tested surface (06 §13.1).
 *
 * Source: REF-12.3, REF-12.4, REF-14.2
 */
import type {
  EntityDetailDto,
  LocationDto,
  LocationSummaryDto,
  NeedBreakdownDto,
} from '@aesfw/protocol';
import type { I18n } from '../i18n/index.js';

export {
  archetypeOf,
  connectivityOverlay,
  entityShapes,
  gridCells,
  shapeGrammar,
  stateEncoding,
  suitabilityOverlay,
} from './grid.js';
export type {
  ConnectivityMarker,
  EntityShape,
  EntityState,
  GridCell,
  GridCellModel,
  InteriorEncoding,
  ShapeArchetype,
  ShapeDescriptor,
  ShapeKind,
  StateEncoding,
} from './grid.js';
export {
  economyView,
  ownerEntry,
  pushTrend,
  CREDITS_RESOURCE_ID,
  REFERENCE_BASE_SCALE,
} from './economy.js';
export type { EconomySourceRow, EconomyViewModel } from './economy.js';
export { planningView } from './planning-view.js';
export type { PlanningChainStageRow, PlanningTierRow, PlanningViewModel } from './planning-view.js';
export {
  commandNotice,
  constructionCommands,
  ghostShape,
  ghostValidity,
  paletteEntries,
  placeEntityPlanPayload,
  placementFootprint,
  placementKeyAction,
  placementQueryPayload,
  reasonLabels,
} from './placement.js';
export type {
  Footprint,
  GhostShape,
  GhostValidity,
  GridBounds,
  PaletteEntry,
  PlacementAction,
  PlacementActionKind,
} from './placement.js';

/** One labelled inspector row. */
export interface InspectorRow {
  readonly label: string;
  readonly value: string;
}

/** The entity inspector view model (REF-12.3). */
export interface InspectorViewModel {
  readonly title: string;
  readonly rows: readonly InspectorRow[];
  readonly commands: readonly string[];
}

/**
 * Builds the entity inspector view model (REF-12.3).
 *
 * Source: REF-12.3
 */
export function entityInspector(detail: EntityDetailDto, i18n: I18n): InspectorViewModel {
  const rows: InspectorRow[] = [
    { label: 'definition', value: i18n.t(detail.definition_id) },
    { label: 'lifecycle', value: detail.lifecycle },
    { label: 'enabled', value: String(detail.enabled) },
  ];
  if (detail.production !== undefined) {
    if (detail.production.recipe_id !== undefined) {
      rows.push({ label: 'recipe', value: i18n.t(detail.production.recipe_id) });
    }
    const percent = Math.round(
      (detail.production.progress * 100) / detail.production.progress_scale,
    );
    rows.push({ label: 'progress', value: `${percent} %` });
  }
  for (const reason of detail.block_reasons) {
    rows.push({ label: 'block', value: reason });
  }
  return { title: i18n.t(detail.definition_id), rows, commands: detail.available_commands };
}

/** One need-breakdown row (REF-12.3). */
export interface NeedRow {
  readonly need: string;
  readonly demand: number;
  readonly delivered: number;
  readonly fulfillment: number;
}

/**
 * Builds the need-breakdown rows, sorted by ascending need ID (REF-12.3).
 *
 * Source: REF-12.3
 */
export function needRows(breakdown: readonly NeedBreakdownDto[], i18n: I18n): readonly NeedRow[] {
  return [...breakdown]
    .sort((a, b) => (a.need_id < b.need_id ? -1 : a.need_id > b.need_id ? 1 : 0))
    .map((entry) => ({
      need: i18n.t(entry.need_id),
      demand: entry.demand,
      delivered: entry.delivered,
      fulfillment: entry.fulfillment,
    }));
}

/** One inventory-table row (REF-12.4). */
export interface InventoryRow {
  readonly resource: string;
  readonly stored: number;
  readonly reserved: number;
  readonly capacity: number | null;
}

/**
 * Builds the inventory rows of a location, sorted by ascending resource ID
 * (REF-12.4).
 *
 * Source: REF-12.4
 */
export function inventoryRows(location: LocationDto, i18n: I18n): readonly InventoryRow[] {
  const rows: InventoryRow[] = [];
  for (const inventory of location.inventories ?? []) {
    for (const entry of inventory.entries) {
      rows.push({
        resource: i18n.t(entry.resource_id),
        stored: entry.stored,
        reserved: entry.reserved,
        capacity: entry.capacity ?? null,
      });
    }
  }
  return rows.sort((a, b) => (a.resource < b.resource ? -1 : a.resource > b.resource ? 1 : 0));
}

/** One population-table row (REF-12.4). */
export interface PopulationRow {
  readonly location: number;
  readonly tier: string;
  readonly count: number;
}

/**
 * Builds the population rows of the location summaries, sorted by ascending
 * location then tier ID (REF-12.4).
 *
 * Source: REF-12.4
 */
export function populationRows(
  summaries: readonly LocationSummaryDto[],
  i18n: I18n,
): readonly PopulationRow[] {
  const rows: PopulationRow[] = [];
  for (const summary of summaries) {
    for (const [tier, count] of Object.entries(summary.population_by_tier ?? {})) {
      rows.push({ location: summary.entity_id, tier: i18n.t(tier), count });
    }
  }
  return rows.sort(
    (a, b) => a.location - b.location || (a.tier < b.tier ? -1 : a.tier > b.tier ? 1 : 0),
  );
}
