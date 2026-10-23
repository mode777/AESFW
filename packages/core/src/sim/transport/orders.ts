/**
 * Transport orders, station cursors, and handling (GDD-15.2, GDD-15.5–15.7,
 * ARCH-14.4). Phase 14 plans a path to the current station, phase 16 stages
 * load and unload transfers within handling rates and throughput, and phase 19
 * commits them through the transaction writer.
 *
 * Source: GDD-15.2, GDD-15.5, GDD-15.6, GDD-15.7, ARCH-14.4, TDS-11.1
 */
import { allocateEntity } from '../../world/create.js';
import type { EntityId, OwnerHandle } from '../../ids/index.js';
import type { EventWriter } from '../../events/event-writer.js';
import type { TickScratch } from '../../pipeline/types.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { quantityOf } from '../../tx/inventory.js';
import type { Inventory } from '../../tx/inventory.js';
import { locationHubOf } from '../location.js';
import { throttlePermilleOf } from '../internal-logistics/throttle.js';
import { removeEntity } from '../construction/finalize.js';
import { cargoFreeCapacity, cargoQuantity, loadCargo, unloadCargo } from './cargo.js';
import { planRoute, startMovement } from './route.js';
import { TRANSPORT_HANDLING_KEY } from './types.js';
import type {
  Cargo,
  FailureKey,
  FailurePolicies,
  PendingTransportTransfer,
  RouteState,
  StationAction,
  StationCursor,
  TransportAssignment,
  TransportHandling,
  TransportMovement,
  TransportOrder,
  TransportOrderSpec,
} from './types.js';

/** The default failure policies (CONT-9: retry). */
export function defaultFailurePolicies(): FailurePolicies {
  return {
    origin_unavailable: 'retry',
    destination_unavailable: 'retry',
    path_unavailable: 'retry',
    cargo_cannot_unload: 'retain',
    exchange_limit_not_met: 'skip',
    establishment_target_occupied: 'return',
  };
}

const emptyCursor = (): StationCursor => ({
  station: 0,
  action: 0,
  handled: 0,
  target: 0,
  started: false,
});

const clearMovement = (movement: TransportMovement): TransportMovement => ({
  ...movement,
  path: [],
  connectionIds: [],
  step: 0,
  progress: 0,
});

const movementOf = (world: World, unit: EntityId): TransportMovement | undefined =>
  world.stores.get<TransportMovement>('movement').get(unit);

const isMoving = (movement: TransportMovement | undefined): boolean => {
  if (movement?.path === undefined) return false;
  const step = movement.step ?? 0;
  return step + 1 < movement.path.length;
};

const orderOf = (world: World, order: EntityId): TransportOrder | undefined =>
  world.stores.get<TransportOrder>('transportOrder').get(order);

const cursorOf = (world: World, unit: EntityId): StationCursor | undefined =>
  world.stores.get<StationCursor>('stationCursor').get(unit);

const assignmentOf = (world: World, unit: EntityId): TransportAssignment | undefined =>
  world.stores.get<TransportAssignment>('transportAssignment').get(unit);

const hubInventory = (world: World, location: EntityId): EntityId | null =>
  locationHubOf(world, location)?.inventories[0] ?? null;

const rateOf = (world: World, unit: EntityId, action: TransportActionName): number => {
  const handling = world.stores.get<TransportHandling>('handling').get(unit);
  if (handling === undefined) return 0;
  return action === 'load' ? handling.loadingRatePerTick : handling.unloadingRatePerTick;
};

type TransportActionName = StationAction['action'];

/**
 * The target quantity of one station action at its start (GDD-15.3). The rule
 * is interpreted from the acting side: a load measures the origin inventory
 * and cargo space, an unload measures the cargo and destination inventory.
 *
 * Source: GDD-15.3
 */
export function actionTarget(
  world: World,
  unit: EntityId,
  action: StationAction,
  inventory: EntityId,
): number {
  const cargo = world.stores.get<Cargo>('cargo').get(unit);
  if (cargo === undefined) return 0;
  const inventoryComponent = world.stores.get<Inventory>('inventory').get(inventory);
  const inventoryQuantity =
    inventoryComponent === undefined ? 0 : quantityOf(inventoryComponent, action.resource);
  const cargoAmount = cargoQuantity(cargo, action.resource);
  const free = cargoFreeCapacity(cargo, action.resource);
  const rule = action.rule;
  const loading = action.action === 'load' || action.action === 'buy';
  let target = 0;
  if (loading) {
    switch (rule.mode) {
      case 'fixed':
        target = rule.quantity;
        break;
      case 'up_to_capacity':
        target = free;
        break;
      case 'all':
        target = Math.min(free, inventoryQuantity);
        break;
      case 'excess_above':
      case 'maintain_origin_minimum':
        target = Math.max(0, inventoryQuantity - rule.quantity);
        break;
      case 'deficit_below':
      case 'maintain_destination_target':
        target = Math.max(0, rule.quantity - cargoAmount);
        break;
      case 'priority_list': {
        const fit = rule.quantities.find(
          (quantity) => quantity <= free && quantity <= inventoryQuantity,
        );
        target = fit ?? 0;
        break;
      }
    }
    return Math.min(target, inventoryQuantity);
  }
  switch (rule.mode) {
    case 'fixed':
      target = rule.quantity;
      break;
    case 'up_to_capacity':
    case 'all':
      target = cargoAmount;
      break;
    case 'excess_above':
    case 'maintain_origin_minimum':
      target = Math.max(0, cargoAmount - rule.quantity);
      break;
    case 'deficit_below':
    case 'maintain_destination_target':
      target = Math.max(0, rule.quantity - inventoryQuantity);
      break;
    case 'priority_list': {
      const fit = rule.quantities.find((quantity) => quantity <= cargoAmount);
      target = fit ?? 0;
      break;
    }
  }
  return Math.min(target, cargoAmount);
}

const currentAction = (
  order: TransportOrder,
  cursor: StationCursor,
): { station: TransportOrder['stations'][number]; action: StationAction } | null => {
  const station = order.stations[cursor.station];
  if (station === undefined) return null;
  const action = station.actions[cursor.action];
  if (action === undefined) return null;
  return { station, action };
};

const advanceAction = (
  world: World,
  unit: EntityId,
  order: TransportOrder,
  cursor: StationCursor,
): StationCursor => {
  const station = order.stations[cursor.station];
  if (station !== undefined && cursor.action + 1 < station.actions.length) {
    return { ...cursor, action: cursor.action + 1, handled: 0, target: 0, started: false };
  }
  if (cursor.station + 1 < order.stations.length) {
    return { station: cursor.station + 1, action: 0, handled: 0, target: 0, started: false };
  }
  if (order.repeat) {
    return emptyCursor();
  }
  unassignTransport(world, unit);
  return cursor;
};

const applyFailure = (
  world: World,
  unit: EntityId,
  order: TransportOrder,
  cursor: StationCursor,
  key: FailureKey,
): void => {
  const policy = order.failurePolicies[key];
  if (policy === 'skip') {
    const next = advanceAction(world, unit, order, cursor);
    world.stores.get<StationCursor>('stationCursor').set(unit, next);
    return;
  }
  if (policy === 'return') {
    world.stores.get<StationCursor>('stationCursor').set(unit, emptyCursor());
    const movement = movementOf(world, unit);
    if (movement !== undefined) {
      world.stores.get<TransportMovement>('movement').set(unit, clearMovement(movement));
    }
    return;
  }
  if (policy === 'fail') {
    unassignTransport(world, unit);
  }
};

/** Collects the throughput requests of docked transport units (phase 09). */
export function collectTransportHandlingRequests(world: World): readonly {
  readonly entity: EntityId;
  readonly location: EntityId;
  readonly quantity: number;
}[] {
  const movementStore = world.stores.get<TransportMovement>('movement');
  const requests: { entity: EntityId; location: EntityId; quantity: number }[] = [];
  for (const unit of movementStore.ids()) {
    const movement = movementStore.get(unit);
    if (movement?.location === undefined || isMoving(movement)) continue;
    const enabled = world.stores.get<{ enabled?: boolean }>('enabled').get(unit);
    if (enabled?.enabled === false) continue;
    const assignment = assignmentOf(world, unit);
    if (assignment?.order == null) continue;
    const order = orderOf(world, assignment.order);
    const cursor = cursorOf(world, unit);
    if (order === undefined || order.mode !== 'route' || cursor === undefined) continue;
    const current = currentAction(order, cursor);
    if (current === null) continue;
    const inventory = hubInventory(world, movement.location);
    if (inventory === null) continue;
    const target = actionTarget(world, unit, current.action, inventory);
    const remaining = Math.max(0, target - cursor.handled);
    const quantity = Math.min(remaining, rateOf(world, unit, current.action.action));
    if (quantity > 0) requests.push({ entity: unit, location: movement.location, quantity });
  }
  return requests.sort((a, b) => a.entity - b.entity);
}

/**
 * Plans a path to the current station for every assigned unit (phase 14).
 *
 * Source: GDD-15.2, ARCH-14.3, ARCH-14.4
 */
export function planTransportOrders(world: World): void {
  const movementStore = world.stores.get<TransportMovement>('movement');
  for (const unit of movementStore.ids()) {
    const assignment = assignmentOf(world, unit);
    if (assignment?.order == null) continue;
    const order = orderOf(world, assignment.order);
    const movement = movementStore.get(unit);
    if (order === undefined || order.mode !== 'route' || movement?.location === undefined) continue;
    if (isMoving(movement)) continue;
    const cursor = cursorOf(world, unit) ?? emptyCursor();
    const station = order.stations[cursor.station];
    if (station === undefined) {
      if (order.repeat) world.stores.get<StationCursor>('stationCursor').set(unit, emptyCursor());
      else unassignTransport(world, unit);
      continue;
    }
    if (movement.location === station.endpoint) {
      world.stores.get<RouteState>('route').set(unit, {
        order: assignment.order,
        station: cursor.station,
        path: [movement.location],
      });
      continue;
    }
    const path = planRoute(
      world,
      movement.location,
      station.endpoint,
      movement.speedPermille,
      movement.allowedConnectionTags,
    );
    if (path === null) {
      applyFailure(world, unit, order, cursor, 'path_unavailable');
      continue;
    }
    startMovement(world, unit, path);
    world.stores.get<RouteState>('route').set(unit, {
      order: assignment.order,
      station: cursor.station,
      path: path.locations,
    });
  }
}

const advanceStationCursor = (
  world: World,
  unit: EntityId,
  order: TransportOrder,
  cursor: StationCursor,
): void => {
  const next = advanceAction(world, unit, order, cursor);
  world.stores.get<StationCursor>('stationCursor').set(unit, next);
  const movement = movementOf(world, unit);
  if (movement !== undefined) {
    world.stores.get<TransportMovement>('movement').set(unit, clearMovement(movement));
  }
};

/**
 * Stages handling transfers for docked units (phase 16).
 *
 * Source: GDD-15.2, GDD-15.4, GDD-15.7, GDD-15.1
 */
export function advanceTransportOrders(
  world: World,
  scratch: TickScratch,
  events: EventWriter,
): void {
  const movementStore = world.stores.get<TransportMovement>('movement');
  const pending: PendingTransportTransfer[] = [];
  for (const unit of movementStore.ids()) {
    const movement = movementStore.get(unit);
    if (movement?.location === undefined || isMoving(movement)) continue;
    const assignment = assignmentOf(world, unit);
    if (assignment?.order == null) continue;
    const order = orderOf(world, assignment.order);
    const cursor = cursorOf(world, unit);
    if (order === undefined || order.mode !== 'route' || cursor === undefined) continue;
    const station = order.stations[cursor.station];
    if (station === undefined || movement.location !== station.endpoint) continue;
    const inventory = hubInventory(world, movement.location);
    if (inventory === null) continue;
    const current = currentAction(order, cursor);
    if (current === null) {
      advanceStationCursor(world, unit, order, cursor);
      continue;
    }
    let target = cursor.target;
    if (!cursor.started) {
      target = actionTarget(world, unit, current.action, inventory);
      if (target <= 0) {
        const key: FailureKey =
          current.action.action === 'load' || current.action.action === 'buy'
            ? 'origin_unavailable'
            : 'cargo_cannot_unload';
        applyFailure(world, unit, order, cursor, key);
        continue;
      }
    }
    const remaining = Math.max(0, target - cursor.handled);
    const rate = rateOf(world, unit, current.action.action);
    const throttled = Math.floor((rate * throttlePermilleOf(world, unit)) / 1000);
    const quantity = Math.min(remaining, throttled);
    if (quantity <= 0) {
      if (!cursor.started) {
        world.stores
          .get<StationCursor>('stationCursor')
          .set(unit, { ...cursor, target, started: true });
      }
      continue;
    }
    pending.push({
      unit,
      order: assignment.order,
      action: current.action.action,
      resource: current.action.resource,
      quantity,
      inventory,
    });
    const handled = cursor.handled + quantity;
    if (handled >= target) {
      const next = advanceAction(world, unit, order, {
        ...cursor,
        handled,
        target,
        started: true,
      });
      world.stores.get<StationCursor>('stationCursor').set(unit, next);
      const nextMovement = movementOf(world, unit);
      if (nextMovement !== undefined) {
        world.stores.get<TransportMovement>('movement').set(unit, clearMovement(nextMovement));
      }
    } else {
      world.stores
        .get<StationCursor>('stationCursor')
        .set(unit, { ...cursor, handled, target, started: true });
    }
    events.emit({
      type: 'TransportHandled',
      subjects: [unit],
      owner: null,
      location: movement.location,
      payload: {
        unit,
        action: current.action.action,
        resource: current.action.resource,
        quantity,
      },
    });
  }
  scratch.values.set(TRANSPORT_HANDLING_KEY, pending);
}

/** Reads phase 16's staged handling transfers. */
export function readTransportHandling(scratch: TickScratch): readonly PendingTransportTransfer[] {
  const value = scratch.values.get(TRANSPORT_HANDLING_KEY);
  return Array.isArray(value) ? (value as readonly PendingTransportTransfer[]) : [];
}

/** Commits staged handling transfers (phase 19). */
export function commitTransportOrders(
  world: World,
  tx: TransactionWriter,
  scratch: TickScratch,
  events: EventWriter,
): void {
  for (const transfer of readTransportHandling(scratch)) {
    const cargo = world.stores.get<Cargo>('cargo').get(transfer.unit);
    if (cargo === undefined) continue;
    if (transfer.action === 'load' || transfer.action === 'buy') {
      const result = tx.atomic((builder) => {
        builder.withdraw({
          inventory: transfer.inventory,
          resource: transfer.resource,
          quantity: transfer.quantity,
          purpose: 'transport_load',
          sink: transfer.unit,
          reason: 'transport_load',
        });
      });
      if (!result.ok) continue;
      const loaded = loadCargo(cargo, transfer.resource, transfer.quantity);
      world.stores.get<Cargo>('cargo').set(transfer.unit, loaded.cargo);
      events.emit({
        type: 'TransportLoaded',
        subjects: [transfer.unit],
        owner: null,
        location:
          world.stores.get<TransportMovement>('movement').get(transfer.unit)?.location ?? null,
        payload: {
          unit: transfer.unit,
          resource: transfer.resource,
          quantity: loaded.loaded,
        },
      });
      continue;
    }
    const result = tx.atomic((builder) => {
      builder.deposit({
        inventory: transfer.inventory,
        resource: transfer.resource,
        quantity: transfer.quantity,
        source: transfer.unit,
        reason: 'transport_unload',
      });
    });
    if (!result.ok) continue;
    const unloaded = unloadCargo(cargo, transfer.resource, transfer.quantity);
    world.stores.get<Cargo>('cargo').set(transfer.unit, unloaded.cargo);
    events.emit({
      type: 'TransportUnloaded',
      subjects: [transfer.unit],
      owner: null,
      location:
        world.stores.get<TransportMovement>('movement').get(transfer.unit)?.location ?? null,
      payload: {
        unit: transfer.unit,
        resource: transfer.resource,
        quantity: unloaded.unloaded,
      },
    });
  }
}

/** Creates an order entity and returns it. */
export function createTransportOrder(
  world: World,
  owner: OwnerHandle,
  spec: TransportOrderSpec,
): EntityId {
  const order = allocateEntity(world);
  world.stores.get<{ owner: number }>('owner').set(order, { owner });
  world.stores.get<TransportOrder>('transportOrder').set(order, spec);
  return order;
}

/** Replaces an order's specification and resets its cursor. */
export function modifyTransportOrder(
  world: World,
  order: EntityId,
  spec: TransportOrderSpec,
): boolean {
  const store = world.stores.get<TransportOrder>('transportOrder');
  if (!store.has(order)) return false;
  store.set(order, spec);
  for (const unit of world.stores.get<TransportAssignment>('transportAssignment').ids()) {
    const assignment = assignmentOf(world, unit);
    if (assignment?.order === order) {
      world.stores.get<StationCursor>('stationCursor').set(unit, emptyCursor());
      const movement = movementOf(world, unit);
      if (movement !== undefined) {
        world.stores.get<TransportMovement>('movement').set(unit, clearMovement(movement));
      }
    }
  }
  return true;
}

/** Deletes an order, unassigning every unit first. */
export function deleteTransportOrder(world: World, order: EntityId): boolean {
  if (!world.stores.get<TransportOrder>('transportOrder').has(order)) return false;
  for (const unit of world.stores.get<TransportAssignment>('transportAssignment').ids()) {
    const assignment = assignmentOf(world, unit);
    if (assignment?.order === order) unassignTransport(world, unit);
  }
  removeEntity(world, order);
  return true;
}

/** Assigns a unit to an order and resets its station cursor. */
export function assignTransport(world: World, unit: EntityId, order: EntityId): boolean {
  if (!world.stores.get<TransportOrder>('transportOrder').has(order)) return false;
  if (!world.stores.get('movement').has(unit) || !world.stores.get('cargo').has(unit)) return false;
  world.stores.get<TransportAssignment>('transportAssignment').set(unit, { order });
  world.stores.get<StationCursor>('stationCursor').set(unit, emptyCursor());
  const movement = movementOf(world, unit);
  if (movement !== undefined) {
    world.stores.get<TransportMovement>('movement').set(unit, clearMovement(movement));
  }
  return true;
}

/** Unassigns a unit from its order and clears movement and route state. */
export function unassignTransport(world: World, unit: EntityId): boolean {
  if (!world.stores.get<TransportAssignment>('transportAssignment').has(unit)) return false;
  world.stores.get<TransportAssignment>('transportAssignment').set(unit, { order: null });
  world.stores.get('route').markRemoved(unit);
  world.stores.get('stationCursor').markRemoved(unit);
  const movement = movementOf(world, unit);
  if (movement !== undefined) {
    world.stores.get<TransportMovement>('movement').set(unit, clearMovement(movement));
  }
  return true;
}

/** Returns a unit's route state, or `undefined`. */
export function routeStateOf(world: World, unit: EntityId): RouteState | undefined {
  return world.stores.get<RouteState>('route').get(unit);
}

/** Returns the assigned order entity of a unit, or `null`. */
export function assignedOrderOf(world: World, unit: EntityId): EntityId | null {
  return assignmentOf(world, unit)?.order ?? null;
}

/** Returns an order's cursor for a unit. */
export function stationCursorOf(world: World, unit: EntityId): StationCursor | undefined {
  return cursorOf(world, unit);
}

/** Returns an order component by entity. */
export function transportOrderOf(world: World, order: EntityId): TransportOrder | undefined {
  return orderOf(world, order);
}
