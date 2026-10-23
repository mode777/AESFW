/**
 * Pure progression-view selectors (REF-12.3, REF-12.4): the tier pyramid, the
 * residence transition checklist, and the coverage overlay read from entity
 * metadata. All values come from projections, read models, or definition
 * metadata; nothing is computed from mechanics.
 *
 * Source: REF-12.3, REF-12.4, PIC-10.1, PIC-4
 */
import type {
  DefinitionMetadataDto,
  EntityDetailDto,
  LocationSummaryDto,
  SnapshotDto,
  TransitionEligibilityDto,
} from '@aesfw/protocol';

/** One tier bar of the pyramid. */
export interface TierBar {
  readonly tierId: string;
  readonly population: number;
}

/** The pyramid of one location. */
export interface PyramidLocation {
  readonly locationId: number;
  readonly tiers: readonly TierBar[];
}

/** The tier pyramid view model. */
export interface PyramidModel {
  readonly locations: readonly PyramidLocation[];
}

/**
 * Builds the tier pyramid from location summaries (REF-12.4). Tiers are
 * ordered by ID for a stable rendering.
 *
 * Source: REF-12.4, PIC-10.2
 */
export function tierPyramid(summaries: readonly LocationSummaryDto[]): PyramidModel {
  const locations = [...summaries]
    .filter((summary) => summary.population_by_tier !== undefined)
    .map((summary) => ({
      locationId: summary.entity_id,
      tiers: Object.entries(summary.population_by_tier ?? {})
        .map(([tierId, population]) => ({ tierId, population }))
        .sort((left, right) =>
          left.tierId < right.tierId ? -1 : left.tierId > right.tierId ? 1 : 0,
        ),
    }))
    .sort((left, right) => left.locationId - right.locationId);
  return { locations };
}

/**
 * Returns the residence's transition checklist (REF-12.3, PIC-10.1).
 *
 * Source: REF-12.3, PIC-10.1
 */
export function residenceChecklist(
  detail: EntityDetailDto | null,
): readonly TransitionEligibilityDto[] {
  return detail?.residence?.transition_eligibility ?? [];
}

/** One coverage circle in the overlay. */
export interface CoverageCircle {
  readonly entityId: number;
  readonly service: string;
  readonly radius: number;
}

/**
 * Builds coverage circles from entity metadata (REF-12.2). A definition whose
 * `service_provider` component has a coverage mode and a radius relation
 * contributes a circle at its entity position.
 *
 * Source: REF-12.2, PIC-4
 */
export function coverageOverlay(
  projection: SnapshotDto | null,
  metadata: readonly DefinitionMetadataDto[],
): readonly CoverageCircle[] {
  if (projection === null) return [];
  const providers = new Map<string, { service: string; radius: number }>();
  for (const definition of metadata) {
    const parameters = definition.parameters as Record<string, unknown>;
    const components = parameters['components'] as Record<string, unknown> | undefined;
    const provider = components?.['service_provider'] as Record<string, unknown> | undefined;
    if (provider?.['mode'] !== 'coverage') continue;
    const relation = provider['relation'] as Record<string, unknown> | undefined;
    const cells = relation?.['cells'];
    const service = provider['service'];
    if (typeof cells !== 'number' || typeof service !== 'string') continue;
    providers.set(definition.definition_id, { service, radius: cells });
  }
  const circles: CoverageCircle[] = [];
  for (const entity of projection.entities) {
    if (entity.definition_id === undefined || entity.spatial === undefined) continue;
    const provider = providers.get(entity.definition_id);
    if (provider === undefined) continue;
    circles.push({
      entityId: entity.entity_id,
      service: provider.service,
      radius: provider.radius,
    });
  }
  return circles;
}
