/**
 * Transport detail read model (PIC-10.4). Derived from authoritative cargo,
 * movement, assignment, order, and cursor state; never written back.
 *
 * Source: PIC-10.4, TDS-18.4
 */
import type {
  Cargo,
  EntityId,
  QuantityRule,
  Registry,
  StationAction,
  StationCursor,
  TransportAssignment,
  TransportMovement,
  TransportOrder,
} from '@aesfw/core';
import type {
  TransportActionDto,
  TransportCargoSlotDto,
  TransportDetailDto,
  TransportStationDto,
} from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

const resourceId = (registry: Registry, handle: number): string =>
  registry.stringIdOf('resource', handle as never) ?? `resource.${handle}`;

const ruleMode = (rule: QuantityRule): string => rule.mode;

const quantityOfRule = (rule: QuantityRule): number | undefined => {
  if ('quantity' in rule) return rule.quantity;
  if (rule.mode === 'priority_list') return rule.quantities[0];
  return undefined;
};

const actionDto = (registry: Registry, action: StationAction): TransportActionDto => {
  const quantity = quantityOfRule(action.rule);
  return {
    resource_id: resourceId(registry, action.resource),
    action: action.action,
    rule_mode: ruleMode(action.rule),
    ...(quantity === undefined ? {} : { quantity }),
  };
};

const stationDtos = (registry: Registry, order: TransportOrder): readonly TransportStationDto[] =>
  order.stations.map((station) => ({
    endpoint_id: String(station.endpoint),
    actions: station.actions.map((action) => actionDto(registry, action)),
  }));

const cargoSlots = (registry: Registry, cargo: Cargo): readonly TransportCargoSlotDto[] => {
  if (cargo.policy === 'typed_slots') {
    return cargo.slots.map((slot, index) => ({
      slot: index,
      ...(slot.resource === null ? {} : { resource_id: resourceId(registry, slot.resource) }),
      quantity: slot.quantity,
    }));
  }
  return cargo.entries.map((entry, index) => ({
    slot: index,
    resource_id: resourceId(registry, entry.resource),
    quantity: entry.quantity,
  }));
};

const stateOf = (
  movement: TransportMovement | undefined,
  order: TransportOrder | undefined,
  cursor: StationCursor | undefined,
): string => {
  if (order === undefined) return 'unassigned';
  if (movement?.path !== undefined && (movement.step ?? 0) + 1 < movement.path.length) {
    return 'moving';
  }
  if (cursor !== undefined) return 'handling';
  return 'waiting';
};

/**
 * Builds the transport detail read model, or `null` when `entity` is not a
 * transport unit (PIC-10.4).
 *
 * Source: PIC-10.4
 */
export function transportDetail(session: SessionState, entity: number): TransportDetailDto | null {
  const world = session.world;
  const registry = session.content.registry;
  const id = entity as EntityId;
  const cargo = world.stores.get<Cargo>('cargo').get(id);
  const movement = world.stores.get<TransportMovement>('movement').get(id);
  const assignment = world.stores.get<TransportAssignment>('transportAssignment').get(id);
  if (cargo === undefined && movement === undefined && assignment === undefined) return null;
  const order =
    assignment?.order == null
      ? undefined
      : world.stores.get<TransportOrder>('transportOrder').get(assignment.order);
  const cursor = world.stores.get<StationCursor>('stationCursor').get(id);
  return {
    entity_id: entity,
    ...(assignment?.order == null ? {} : { order_id: assignment.order }),
    ...(order === undefined ? {} : { mode: order.mode }),
    state: stateOf(movement, order, cursor),
    ...(order === undefined ? {} : { stations: stationDtos(registry, order) }),
    ...(cursor === undefined ? {} : { current_station: cursor.station }),
    ...(movement?.connectionIds === undefined || movement.connectionIds.length === 0
      ? {}
      : { connection_path: [...movement.connectionIds] }),
    ...(cargo === undefined
      ? {}
      : { cargo: { policy: cargo.policy, slots: cargoSlots(registry, cargo) } }),
    ...(cursor === undefined
      ? {}
      : {
          progress: {
            action_index: cursor.action,
            handled: cursor.handled,
            target: cursor.target,
          },
        }),
    ...(cursor?.failure === undefined ? {} : { failure_reasons: [cursor.failure] }),
  };
}
