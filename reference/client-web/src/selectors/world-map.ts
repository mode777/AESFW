/**
 * Pure world-map selectors (REF-12.1). Locations are laid out deterministically
 * from their entity ids; connections come from the snapshot's connection
 * details; transport dots come from the snapshot's transport summary.
 *
 * Source: REF-12.1, REF-14.3
 */
import type { EntityDto, LocationDto } from '@aesfw/protocol';

/** One location marker on the world map. */
export interface WorldMapPoint {
  readonly locationId: number;
  readonly x: number;
  readonly y: number;
  readonly knowledge: string;
  readonly active: boolean;
  readonly ownerId?: string;
}

/** One connection line on the world map. */
export interface WorldMapConnection {
  readonly connectionId: string;
  readonly from: WorldMapPoint;
  readonly to: WorldMapPoint;
  readonly baseDurationTicks: number;
  readonly enabled: boolean;
}

/** The world-map model. */
export interface WorldMapModel {
  readonly width: number;
  readonly height: number;
  readonly points: readonly WorldMapPoint[];
  readonly connections: readonly WorldMapConnection[];
  readonly transports: readonly WorldMapTransport[];
}

/** One transport dot. */
export interface WorldMapTransport {
  readonly entityId: number;
  readonly x: number;
  readonly y: number;
  readonly state: string;
  readonly orderId?: number;
}

const pointOf = (locations: readonly LocationDto[], id: number): WorldMapPoint | undefined => {
  const sorted = [...locations].sort((a, b) => a.entity_id - b.entity_id);
  const index = sorted.findIndex((location) => location.entity_id === id);
  if (index < 0) return undefined;
  const location = sorted[index];
  if (location === undefined) return undefined;
  const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    locationId: location.entity_id,
    x: 120 + column * 240,
    y: 120 + row * 180,
    knowledge: location.knowledge ?? 'unknown',
    active: location.active ?? true,
    ...(location.owner_id === undefined ? {} : { ownerId: location.owner_id }),
  };
};

/**
 * Builds the world-map model from locations and entities (REF-12.1).
 *
 * Source: REF-12.1
 */
export function worldMap(
  locations: readonly LocationDto[],
  entities: readonly EntityDto[],
): WorldMapModel {
  const sorted = [...locations].sort((a, b) => a.entity_id - b.entity_id);
  const points = sorted
    .map((location) => pointOf(sorted, location.entity_id))
    .filter((point): point is WorldMapPoint => point !== undefined);
  const byId = new Map(points.map((point) => [point.locationId, point]));
  const seen = new Set<string>();
  const connections: WorldMapConnection[] = [];
  for (const location of sorted) {
    for (const detail of location.connection_details ?? []) {
      if (seen.has(detail.connection_id)) continue;
      seen.add(detail.connection_id);
      const from = byId.get(detail.origin_id);
      const to = byId.get(detail.destination_id);
      if (from === undefined || to === undefined) continue;
      connections.push({
        connectionId: detail.connection_id,
        from,
        to,
        baseDurationTicks: detail.base_duration_ticks,
        enabled: detail.enabled,
      });
    }
  }
  const transports: WorldMapTransport[] = [];
  for (const entity of entities) {
    if (entity.transport === undefined || entity.location_id === undefined) continue;
    const point = byId.get(entity.location_id);
    if (point === undefined) continue;
    transports.push({
      entityId: entity.entity_id,
      x: point.x,
      y: point.y,
      state: entity.transport.state,
      ...(entity.transport.order_id === undefined ? {} : { orderId: entity.transport.order_id }),
    });
  }
  const columns = Math.max(1, Math.ceil(Math.sqrt(sorted.length)));
  return {
    width: 240 + (columns - 1) * 240,
    height: 240 + Math.max(0, Math.ceil(sorted.length / columns) - 1) * 180,
    points,
    connections,
    transports: transports.sort((a, b) => a.entityId - b.entityId),
  };
}
