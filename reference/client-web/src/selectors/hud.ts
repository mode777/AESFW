/**
 * The HUD selectors (REF-11): the viewed location, the resource bar, and the
 * location banner. They are pure functions over the mirror's projection and the
 * read models, so they are unit-tested without a DOM (07 §14.2).
 *
 * Source: REF-11, REF-14.2, PIC-9.3, PIC-10.2, PIC-10.6
 */
import type {
  DefinitionMetadataDto,
  LocationDto,
  LocationSummaryDto,
  SnapshotDto,
} from '@aesfw/protocol';

import { mappingOf } from '../content/presentation.js';
import type { Formatter } from '../format/index.js';

/** The credits resource of the reference package. */
export const CREDITS_RESOURCE_ID = 'ref.tier.resource.credits';

/** The construction role tag (REF-11: the resource bar's defaults). */
export const CONSTRUCTION_TAG = 'ref.tier.role.construction';

/** One chip of the resource bar. */
export interface ResourceChip {
  readonly resourceId: string;
  readonly label: string;
  readonly value: string;
  readonly pinned: boolean;
}

/** The resource bar model (REF-11). */
export interface ResourceBarModel {
  readonly balance: string;
  readonly netRate: string;
  readonly chips: readonly ResourceChip[];
}

/**
 * The location whose stock the HUD shows (REF-11). This row has no camera yet,
 * so it is the selected or the previously viewed location, falling back to the
 * first known location of the actor.
 *
 * Source: REF-11
 */
export const viewedLocation = (
  projection: SnapshotDto | null,
  locationId: number | null,
): LocationDto | null => {
  if (projection === null) return null;
  const known = projection.locations.filter((entry) => entry.knowledge !== 'unknown');
  if (locationId !== null) {
    const selected = known.find((entry) => entry.entity_id === locationId);
    if (selected !== undefined) return selected;
  }
  return known[0] ?? null;
};

/** The display label of a definition: its localization name, else the code. */
export const definitionLabel = (
  definitionId: string,
  definitions: readonly DefinitionMetadataDto[],
): string => {
  const entry = definitions.find((definition) => definition.definition_id === definitionId);
  return entry?.presentation_key ?? definitionId.split('.').at(-1)?.toUpperCase() ?? definitionId;
};

/**
 * Builds the resource bar (REF-11): the owner balance and net rate from the
 * economy read model (PIC-10.6), then the viewed location's stock chips. The
 * defaults are the construction-tagged resources; pinned resources are appended
 * in pin order. Nothing here judges affordability (amendment A14).
 *
 * Source: REF-11, PIC-10.6, PIC-10.2
 */
export const resourceBar = (
  owner:
    | {
        readonly resources?: Readonly<Record<string, number>>;
        readonly balance?: { readonly net_per_interval?: number };
      }
    | undefined,
  summary: LocationSummaryDto | null,
  definitions: readonly DefinitionMetadataDto[],
  pins: readonly string[],
  formatter: Formatter,
): ResourceBarModel => {
  const resources = owner?.resources ?? {};
  const balance = formatter.format(resources[CREDITS_RESOURCE_ID] ?? 0);
  const netRate = formatter.formatRate(owner?.balance?.net_per_interval ?? 0);
  const defaults = definitions
    .filter((definition) => definition.tags.includes(CONSTRUCTION_TAG))
    .map((definition) => definition.definition_id);
  const pinned = pins.filter((id) => !defaults.includes(id));
  const chips: ResourceChip[] = [];
  for (const resourceId of [...defaults, ...pinned]) {
    const stored = summary?.inventory_totals?.[resourceId];
    chips.push({
      resourceId,
      label: definitionLabel(resourceId, definitions),
      value: formatter.format(stored ?? 0),
      pinned: pinned.includes(resourceId),
    });
  }
  return { balance, netRate, chips };
};

/** The location banner model (REF-11). */
export interface LocationBannerModel {
  readonly code: string;
  readonly region: string | null;
  readonly owned: boolean;
  readonly slotTypes: readonly string[];
  readonly suitability: readonly { readonly property: string; readonly permille: number }[];
}

/**
 * Builds the location banner (REF-11): code, region, ownership, slot types, and
 * suitability. An unknown location renders nothing (PIC-9.3); a known one always
 * has a code.
 *
 * Source: REF-11, PIC-9.3
 */
export const locationBanner = (location: LocationDto | null): LocationBannerModel | null => {
  if (location === null || location.knowledge === 'unknown') return null;
  const values = location.properties?.values ?? {};
  return {
    code: (location.definition_id ?? `location ${location.entity_id}`).split('.').at(-1) ?? '',
    region: location.properties?.region ?? null,
    owned: location.owner_id !== undefined,
    slotTypes: location.properties?.tags ?? [],
    suitability: Object.entries(values)
      .filter(([property]) => property.includes('suitability'))
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([property, permille]) => ({ property, permille })),
  };
};

/** The build-menu category of a placeable definition (REF-12.3, 04 §6). */
export const categoryOf = (definitionId: string): string | null =>
  mappingOf(definitionId)?.category_key ?? null;
