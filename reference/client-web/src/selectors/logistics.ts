/**
 * Pure logistics-view selectors (REF-12.4). Units come from the snapshot,
 * orders from the transport-orders read model, and the selected unit's detail
 * from the transport-detail read model. Draft editing is pure data.
 *
 * Source: REF-12.4, PIC-10.4
 */
import type {
  JsonObject,
  LocationDto,
  SnapshotDto,
  TransportDetailDto,
  TransportOrderDto,
} from '@aesfw/protocol';

/** One transport unit row. */
export interface LogisticsUnitRow {
  readonly entityId: number;
  readonly state: string;
  readonly orderId?: number;
}

/** One order row. */
export interface LogisticsOrderRow {
  readonly orderId: number;
  readonly mode: string;
  readonly stationCount: number;
  readonly repeat: boolean;
}

/** One action in a route draft. */
export interface RouteActionDraft {
  readonly resourceId: string;
  readonly action: string;
  readonly ruleMode: string;
  readonly quantity?: number;
  readonly priceLimit?: number;
}

/** One station in a route draft. */
export interface RouteStationDraft {
  readonly endpointId: number;
  readonly actions: readonly RouteActionDraft[];
}

/** An editable route draft. */
export interface RouteDraft {
  readonly orderId?: number;
  readonly mode: string;
  readonly repeat: boolean;
  readonly stations: readonly RouteStationDraft[];
}

/** The logistics view model. */
export interface LogisticsViewModel {
  readonly units: readonly LogisticsUnitRow[];
  readonly orders: readonly LogisticsOrderRow[];
  readonly orderDetails: readonly TransportOrderDto[];
  readonly locations: readonly LocationDto[];
  readonly detail: TransportDetailDto | null;
  readonly draft: RouteDraft | null;
}

/** Extracts transport units from a projection. */
export function transportUnits(projection: SnapshotDto | null): readonly LogisticsUnitRow[] {
  const rows: LogisticsUnitRow[] = [];
  for (const entity of projection?.entities ?? []) {
    if (entity.transport === undefined) continue;
    rows.push({
      entityId: entity.entity_id,
      state: entity.transport.state,
      ...(entity.transport.order_id === undefined ? {} : { orderId: entity.transport.order_id }),
    });
  }
  return rows.sort((a, b) => a.entityId - b.entityId);
}

/** Builds order rows from the transport-orders read model. */
export function orderRows(orders: readonly TransportOrderDto[]): readonly LogisticsOrderRow[] {
  return orders
    .map((order) => ({
      orderId: order.order_id,
      mode: order.mode,
      stationCount: order.stations.length,
      repeat: order.repeat,
    }))
    .sort((a, b) => a.orderId - b.orderId);
}

/** Builds the logistics view model. */
export function logisticsView(
  projection: SnapshotDto | null,
  orders: readonly TransportOrderDto[],
  detail: TransportDetailDto | null,
  draft: RouteDraft | null,
): LogisticsViewModel {
  return {
    units: transportUnits(projection),
    orders: orderRows(orders),
    orderDetails: orders,
    locations: projection?.locations ?? [],
    detail,
    draft,
  };
}

/** Builds a draft from an existing order. */
export function draftFromOrder(order: TransportOrderDto): RouteDraft {
  return {
    orderId: order.order_id,
    mode: order.mode,
    repeat: order.repeat,
    stations: order.stations.map((station) => ({
      endpointId: Number(station.endpoint_id),
      actions: station.actions.map((action) => ({
        resourceId: action.resource_id,
        action: action.action,
        ruleMode: action.rule_mode,
        ...(action.quantity === undefined ? {} : { quantity: action.quantity }),
      })),
    })),
  };
}

/** Builds an empty two-station load/unload draft. */
export function emptyDraft(origin: number, destination: number, resourceId: string): RouteDraft {
  return {
    mode: 'route',
    repeat: true,
    stations: [
      {
        endpointId: origin,
        actions: [{ resourceId, action: 'load', ruleMode: 'all' }],
      },
      {
        endpointId: destination,
        actions: [{ resourceId, action: 'unload', ruleMode: 'all' }],
      },
    ],
  };
}

const needsQuantity = (mode: string): boolean =>
  mode === 'fixed' ||
  mode === 'excess_above' ||
  mode === 'deficit_below' ||
  mode === 'maintain_origin_minimum' ||
  mode === 'maintain_destination_target';

/** Converts a draft to a command payload. */
export function draftPayload(draft: RouteDraft): JsonObject {
  return {
    mode: draft.mode,
    repeat: draft.repeat,
    stations: draft.stations.map((station) => ({
      endpoint: station.endpointId,
      actions: station.actions.map((action) => ({
        resource: action.resourceId,
        action: action.action,
        rule:
          action.ruleMode === 'priority_list'
            ? {
                mode: action.ruleMode,
                quantities: [action.quantity ?? 0],
              }
            : needsQuantity(action.ruleMode)
              ? { mode: action.ruleMode, quantity: action.quantity ?? 0 }
              : { mode: action.ruleMode },
        ...(action.priceLimit === undefined ? {} : { price_limit: action.priceLimit }),
      })),
    })),
  };
}

/** True when a draft has at least one station and every station has an action. */
export function draftValid(draft: RouteDraft): boolean {
  return (
    draft.stations.length > 0 &&
    draft.stations.every(
      (station) =>
        Number.isSafeInteger(station.endpointId) &&
        station.actions.length > 0 &&
        station.actions.every((action) => action.resourceId.length > 0),
    )
  );
}
