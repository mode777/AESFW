/**
 * The statistics window (REF-12.4): the owner economy, the tier pyramid per
 * location and for the owner, and capability supply versus demand. All values
 * come from the economy and location-summary read models; the window computes
 * no mechanics.
 *
 * Source: REF-12.4, PIC-10.2, PIC-10.6
 */
import type { LocationSummaryDto } from '@aesfw/protocol';

import { economyView } from './economy.js';
import type { EconomyViewModel } from './economy.js';

/** One tier row of the pyramid (REF-12.4). */
export interface PyramidRow {
  readonly scope: string;
  readonly tierId: string;
  readonly count: number;
}

/** One capability row (REF-12.4). */
export interface CapabilityRow {
  readonly locationId: number;
  readonly capabilityId: string;
  readonly supplied: number;
}

/** The statistics view model (REF-12.4). */
export interface StatisticsModel {
  readonly economy: EconomyViewModel;
  readonly pyramid: readonly PyramidRow[];
  readonly capabilities: readonly CapabilityRow[];
}

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Builds the statistics model (REF-12.4). Pyramid rows are ordered by scope,
 * then tier; capability rows by location, then capability.
 *
 * Source: REF-12.4
 */
export function statisticsView(
  projection: Parameters<typeof economyView>[0],
  ownerId: string,
  summaries: readonly LocationSummaryDto[],
): StatisticsModel {
  const pyramid: PyramidRow[] = [];
  const capabilities: CapabilityRow[] = [];
  const ownerTotals: Record<string, number> = {};
  for (const summary of [...summaries].sort((a, b) => a.entity_id - b.entity_id)) {
    const locationId = `location ${summary.entity_id}`;
    for (const [tierId, count] of Object.entries(summary.population_by_tier ?? {})) {
      pyramid.push({ scope: locationId, tierId, count });
      ownerTotals[tierId] = (ownerTotals[tierId] ?? 0) + count;
    }
    for (const [capabilityId, supplied] of Object.entries(summary.capability_totals ?? {})) {
      capabilities.push({ locationId: summary.entity_id, capabilityId, supplied });
    }
  }
  for (const [tierId, count] of Object.entries(ownerTotals)) {
    pyramid.push({ scope: 'owner', tierId, count });
  }
  pyramid.sort((a, b) =>
    a.scope === b.scope ? compareStrings(a.tierId, b.tierId) : compareStrings(a.scope, b.scope),
  );
  capabilities.sort((a, b) =>
    a.locationId === b.locationId
      ? compareStrings(a.capabilityId, b.capabilityId)
      : a.locationId - b.locationId,
  );
  return { economy: economyView(projection, ownerId, []), pyramid, capabilities };
}
