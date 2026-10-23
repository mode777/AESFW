/**
 * The planning drawer view model (REF-12.4, PIC-10.5). Flattens the planning
 * read model into deterministic table rows; no DOM work.
 *
 * Source: REF-12.4, PIC-10.5
 */
import type { PlanningDto } from '@aesfw/protocol';

/** One tier row of the planning view (REF-12.4). */
export interface PlanningTierRow {
  readonly resourceId: string;
  readonly scope: string;
  readonly locationId: number | null;
  readonly netPerTick: number;
  readonly tierId: string;
  readonly perCapitaPermille: number;
  readonly supported: number;
  readonly population: number;
  readonly coveragePermille: number;
}

/** One chain stage row of the planning view (REF-12.4). */
export interface PlanningChainStageRow {
  readonly resourceId: string;
  readonly definitionId: string;
  readonly count: number;
  readonly ratio: number;
  readonly outputPerTick: number;
  readonly footprint: number;
  readonly maintenancePerInterval: number;
  readonly capabilityDemand: readonly { readonly capability: string; readonly quantity: number }[];
}

/** The planning drawer view model (REF-12.4). */
export interface PlanningViewModel {
  readonly tierRows: readonly PlanningTierRow[];
  readonly chainRows: readonly PlanningChainStageRow[];
}

const compare = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

const capabilityEntries = (
  demand: Readonly<Record<string, number>>,
): readonly { readonly capability: string; readonly quantity: number }[] =>
  Object.entries(demand)
    .map(([capability, quantity]) => ({ capability, quantity }))
    .sort((left, right) => compare(left.capability, right.capability));

/**
 * Builds the planning drawer view model (REF-12.4, PIC-10.5).
 *
 * Source: REF-12.4, PIC-10.5
 */
export function planningView(planning: PlanningDto | null): PlanningViewModel {
  const tierRows: PlanningTierRow[] = [];
  const chainRows: PlanningChainStageRow[] = [];
  if (planning === null) return { tierRows, chainRows };

  for (const resource of planning.resources) {
    for (const scope of resource.scopes) {
      for (const tier of scope.tiers) {
        tierRows.push({
          resourceId: resource.resource_id,
          scope: scope.scope,
          locationId: scope.location_id ?? null,
          netPerTick: scope.net_per_tick,
          tierId: tier.tier_id,
          perCapitaPermille: tier.per_capita_permille,
          supported: tier.supported,
          population: tier.consuming_population,
          coveragePermille: tier.coverage_permille,
        });
      }
    }
  }
  for (const chain of planning.chains) {
    for (const stage of chain.stages) {
      chainRows.push({
        resourceId: chain.resource_id,
        definitionId: stage.definition_id,
        count: stage.count,
        ratio: stage.ratio,
        outputPerTick: stage.output_per_tick,
        footprint: stage.footprint,
        maintenancePerInterval: stage.maintenance_per_interval,
        capabilityDemand: capabilityEntries(stage.capability_demand),
      });
    }
  }
  tierRows.sort(
    (left, right) =>
      compare(left.resourceId, right.resourceId) ||
      compare(left.scope, right.scope) ||
      (left.locationId ?? -1) - (right.locationId ?? -1) ||
      compare(left.tierId, right.tierId),
  );
  chainRows.sort(
    (left, right) =>
      compare(left.resourceId, right.resourceId) || compare(left.definitionId, right.definitionId),
  );
  return { tierRows, chainRows };
}
