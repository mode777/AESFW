/**
 * The deterministic world layout (REF-12.1). Regions are clusters in ascending
 * region ID order, locations sit on a fixed ring inside their cluster in
 * ascending ID order, and islands are sized from their grid. The layout is
 * presentation only: it is stable across reloads and never changes the
 * simulation.
 *
 * Source: REF-12.1
 */
import type { ConnectionDto, LocationDto } from '@aesfw/protocol';

/** The radius of a region cluster's ring, in world units. */
const RING_RADIUS = 220;
/** The horizontal distance between two region clusters. */
const CLUSTER_SPACING = 620;
/** Islands without a grid (unknown, abstract) use this size. */
const DEFAULT_ISLAND = 120;
/** The smallest and largest island edge, in world units. */
const MIN_ISLAND = 90;
const MAX_ISLAND = 220;

/** One island of the layout. */
export interface IslandLayout {
  readonly locationId: number;
  readonly region: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly knowledge: string;
}

/** One lane of the layout; `from`/`to` are location IDs. */
export interface LaneLayout {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly durationTicks: number | null;
  readonly enabled: boolean;
}

/** The world layout (REF-12.1). */
export interface WorldLayout {
  readonly islands: readonly IslandLayout[];
  readonly lanes: readonly LaneLayout[];
  readonly regions: readonly string[];
  /** The bounding box of every island, in world units. */
  readonly bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  };
}

const islandSize = (location: LocationDto): number => {
  const grid = location.grid;
  if (grid === undefined) return DEFAULT_ISLAND;
  const edge = Math.max(grid.width, grid.height);
  return Math.min(MAX_ISLAND, Math.max(MIN_ISLAND, edge * 4));
};

const compareStrings = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Builds the world layout (REF-12.1). Unknown locations are included as
 * fog-sized islands so their known lanes keep their geometry; lanes appear
 * once even when both endpoints report them (the snapshot lists a connection on
 * each of its locations).
 *
 * Source: REF-12.1
 */
export function worldLayout(
  locations: readonly LocationDto[],
  lanes: readonly ConnectionDto[] = [],
): WorldLayout {
  const sorted = [...locations].sort((a, b) => a.entity_id - b.entity_id);
  const regions = [
    ...new Set(sorted.map((location) => location.properties?.region ?? 'unclaimed')),
  ].sort(compareStrings);
  const islands: IslandLayout[] = [];
  for (const [clusterIndex, region] of regions.entries()) {
    const members = sorted.filter(
      (location) => (location.properties?.region ?? 'unclaimed') === region,
    );
    const centreX = clusterIndex * CLUSTER_SPACING;
    members.forEach((location, index) => {
      const angle = members.length === 1 ? 0 : (2 * Math.PI * index) / members.length;
      islands.push({
        locationId: location.entity_id,
        region,
        x: Math.round(centreX + Math.cos(angle) * RING_RADIUS),
        y: Math.round(Math.sin(angle) * RING_RADIUS),
        size: islandSize(location),
        knowledge: location.knowledge ?? 'unknown',
      });
    });
  }

  const byId = new Map(islands.map((island) => [island.locationId, island]));
  const seen = new Set<string>();
  const laneLayouts: LaneLayout[] = [];
  for (const lane of lanes) {
    const key = [lane.origin_id, lane.destination_id].sort((a, b) => a - b).join('-');
    if (seen.has(key)) continue;
    seen.add(key);
    if (!byId.has(lane.origin_id) || !byId.has(lane.destination_id)) continue;
    laneLayouts.push({
      id: lane.connection_id ?? key,
      from: lane.origin_id,
      to: lane.destination_id,
      durationTicks: lane.base_duration_ticks ?? null,
      enabled: lane.enabled !== false,
    });
  }
  laneLayouts.sort((a, b) => compareStrings(a.id, b.id));

  const xs = islands.map((island) => island.x);
  const ys = islands.map((island) => island.y);
  const pad = MAX_ISLAND;
  const bounds = {
    minX: (xs.length === 0 ? 0 : Math.min(...xs)) - pad,
    minY: (ys.length === 0 ? 0 : Math.min(...ys)) - pad,
    maxX: (xs.length === 0 ? 0 : Math.max(...xs)) + pad,
    maxY: (ys.length === 0 ? 0 : Math.max(...ys)) + pad,
  };
  return { islands, lanes: laneLayouts, regions, bounds };
}

/** The island of one location, or `null`. */
export const islandOf = (layout: WorldLayout, locationId: number): IslandLayout | null =>
  layout.islands.find((island) => island.locationId === locationId) ?? null;
