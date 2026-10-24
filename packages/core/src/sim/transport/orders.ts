/**
 * Transport orders, station cursors, and handling (GDD-15.2, GDD-15.5–15.7,
 * ARCH-14.4). Phase 14 plans a path to the current station, phase 16 stages
 * load and unload transfers within handling rates and throughput, and phase 19
 * commits them through the transaction writer.
 *
 * Source: GDD-15.2, GDD-15.5, GDD-15.6, GDD-15.7, ARCH-14.4, TDS-11.1
 */
import { allocateEntity } from '../../world/create.js';
import type { DefinitionHandle, EntityId, OwnerHandle } from '../../ids/index.js';
import type { EstablishmentSystem } from '../../pipeline/types.js';
import type { Registry } from '../../registry/types.js';
import type { Location } from '../location.js';
import { readTransportArrivals } from './route.js';
import type { EventWriter } from '../../events/event-writer.js';
import type { TickScratch } from '../../pipeline/types.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import { quantityOf } from '../../tx/inventory.js';
import type { Inventory } from '../../tx/inventory.js';
import { locationHubOf } from '../location.js';
import { exchangeAtLocation } from '../exchanges/index.js';
import type { ExchangeRef } from '../exchanges/index.js';
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

export const clearMovement = (movement: TransportMovement): TransportMovement => ({
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

export const orderOf = (world: World, order: EntityId): TransportOrder | undefined =>
  world.stores.get<TransportOrder>('transportOrder').get(order);

export const cursorOf = (world: World, unit: EntityId): StationCursor | undefined =>
  world.stores.get<StationCursor>('stationCursor').get(unit);

const assignmentOf = (world: World, unit: EntityId): TransportAssignment | undefined =>
  world.stores.get<TransportAssignment>('transportAssignment').get(unit);

const hubInventory = (world: World, location: EntityId): EntityId | null =>
  locationHubOf(world, location)?.inventories[0] ?? null;

const rateOf = (world: World, unit: EntityId, action: TransportActionName): number => {
  const handling = world.stores.get<TransportHandling>('handling').get(unit);
  if (handling === undefined) return 0;
  return action === 'load' || action === 'buy'
    ? handling.loadingRatePerTick
    : handling.unloadingRatePerTick;
};

type TransportActionName = StationAction['action'];

const isTradeAction = (action: TransportActionName): boolean =>
  action === 'buy' || action === 'sell';

/**
 * The target quantity of one trade action at an exchange (GDD-17.4). The
 * exchange's stock is unbounded, so the rule is measured from the acting side
 * against the cargo alone: a buy targets cargo space, a sell targets the
 * cargo. Rules that reference the far inventory fall back to their constant
 * (`excess_above`, `maintain_origin_minimum`) or to the cargo bound
 * (`deficit_below`, `maintain_destination_target`, `all` on the sell side).
 *
 * Source: GDD-17.4, GDD-15.3
 */
export function tradeTarget(world: World, unit: EntityId, action: StationAction): number {
  const cargo = world.stores.get<Cargo>('cargo').get(unit);
  if (cargo === undefined) return 0;
  const amount = cargoQuantity(cargo, action.resource);
  const free = cargoFreeCapacity(cargo, action.resource);
  const rule = action.rule;
  if (action.action === 'buy') {
    switch (rule.mode) {
      case 'fixed':
      case 'excess_above':
      case 'maintain_origin_minimum':
        return Math.min(rule.quantity, free);
      case 'up_to_capacity':
      case 'all':
        return free;
      case 'deficit_below':
      case 'maintain_destination_target':
        return Math.min(Math.max(0, rule.quantity - amount), free);
      case 'priority_list': {
        const fit = rule.quantities.find((quantity) => quantity <= free);
        return fit ?? 0;
      }
    }
  }
  switch (rule.mode) {
    case 'fixed':
    case 'excess_above':
    case 'maintain_origin_minimum':
      return Math.min(rule.quantity, amount);
    case 'up_to_capacity':
    case 'all':
    case 'deficit_below':
    case 'maintain_destination_target':
      return amount;
    case 'priority_list': {
      const fit = rule.quantities.find((quantity) => quantity <= amount);
      return fit ?? 0;
    }
  }
}

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

export const currentAction = (
  order: TransportOrder,
  cursor: StationCursor,
): { station: TransportOrder['stations'][number]; action: StationAction } | null => {
  const station = order.stations[cursor.station];
  if (station === undefined) return null;
  const action = station.actions[cursor.action];
  if (action === undefined) return null;
  return { station, action };
};

export const advanceAction = (
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

export const applyFailure = (
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
    return;
  }
  if (policy === 'wait' || policy === 'retry' || policy === 'retain') {
    world.stores.get<StationCursor>('stationCursor').set(unit, { ...cursor, failure: key });
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
    if (
      order === undefined ||
      (order.mode !== 'route' && order.mode !== 'explore' && order.mode !== 'establish') ||
      movement?.location === undefined
    )
      continue;
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
 * The exchange a trade station's endpoint names, when that endpoint is an
 * exchange entity at `location` (GDD-17.2), otherwise the first exchange at
 * `location` itself, or `null`.
 *
 * Source: GDD-17.2
 */
const exchangeEndpointAt = (
  world: World,
  endpoint: EntityId,
  location: EntityId,
): EntityId | null => {
  const component = world.stores.get<ExchangeRef>('exchangeRef').get(endpoint);
  if (component !== undefined && component.location === location) return endpoint;
  return exchangeAtLocation(world, location);
};

/**
 * Stages handling and trade transfers for docked units (phase 16). Trade
 * actions defer their cursor advancement to phase 17 so a refused trade can
 * still apply its failure policy.
 *
 * Source: GDD-15.2, GDD-15.4, GDD-15.7, GDD-15.1, GDD-17.4
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
    if (
      order === undefined ||
      (order.mode !== 'route' && order.mode !== 'explore' && order.mode !== 'trade') ||
      cursor === undefined
    )
      continue;
    const station = order.stations[cursor.station];
    if (station === undefined) continue;
    const trading = station.actions.some((entry) => isTradeAction(entry.action));
    const reached =
      station.endpoint === movement.location ||
      (trading && exchangeEndpointAt(world, station.endpoint, movement.location) !== null);
    if (!reached) continue;
    const current = currentAction(order, cursor);
    if (current === null) {
      advanceStationCursor(world, unit, order, cursor);
      continue;
    }
    const tradingAction = isTradeAction(current.action.action);
    let exchange: EntityId | null = null;
    let inventory: EntityId | undefined;
    if (tradingAction) {
      exchange = exchangeEndpointAt(world, station.endpoint, movement.location);
      if (exchange === null && !cursor.started) {
        applyFailure(
          world,
          unit,
          order,
          cursor,
          current.action.action === 'buy' ? 'origin_unavailable' : 'destination_unavailable',
        );
        continue;
      }
    } else {
      const hub = hubInventory(world, movement.location);
      if (hub === null) continue;
      inventory = hub;
    }
    let target = cursor.target;
    if (!cursor.started) {
      target = tradingAction
        ? tradeTarget(world, unit, current.action)
        : actionTarget(world, unit, current.action, inventory as EntityId);
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
      inventory: tradingAction ? null : (inventory as EntityId),
      exchange,
    });
    const handled = cursor.handled + quantity;
    if (handled >= target && !tradingAction) {
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
    if (!tradingAction) {
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
  }
  scratch.values.set(TRANSPORT_HANDLING_KEY, pending);
}

/** Reads phase 16's staged handling transfers. */
export function readTransportHandling(scratch: TickScratch): readonly PendingTransportTransfer[] {
  const value = scratch.values.get(TRANSPORT_HANDLING_KEY);
  return Array.isArray(value) ? (value as readonly PendingTransportTransfer[]) : [];
}

/** Commits staged handling transfers (phase 19). Trades were consumed by phase 17. */
export function commitTransportOrders(
  world: World,
  tx: TransactionWriter,
  scratch: TickScratch,
  events: EventWriter,
): void {
  for (const transfer of readTransportHandling(scratch)) {
    if (transfer.action !== 'load' && transfer.action !== 'unload') continue;
    const cargo = world.stores.get<Cargo>('cargo').get(transfer.unit);
    const inventory = transfer.inventory;
    if (cargo === undefined || inventory === null) continue;
    if (transfer.action === 'load') {
      const result = tx.atomic((builder) => {
        builder.withdraw({
          inventory,
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
        inventory,
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

/** The knowledge-level order `unknown < discovered < established` (INV-14). */
const KNOWLEDGE_RANK: Readonly<Record<string, number>> = {
  unknown: 0,
  discovered: 1,
  established: 2,
};

/**
 * Raises an owner's knowledge of a location to at least `level`, keeping the
 * entries sorted by ascending location (GDD-16.1).
 *
 * Source: GDD-16.1, ARCH-14.4
 */
export function raiseKnowledge(
  world: World,
  owner: OwnerHandle,
  location: EntityId,
  level: 'discovered' | 'established',
): 'changed' | 'unchanged' {
  const owners = [...world.owners.owners];
  const state = owners[owner];
  if (state === undefined) return 'unchanged';
  const existing = state.knowledge.find((entry) => entry.location === location);
  const current = existing?.level ?? 'unknown';
  if ((KNOWLEDGE_RANK[current] ?? 0) >= (KNOWLEDGE_RANK[level] ?? 0)) return 'unchanged';
  const knowledge = [
    ...state.knowledge.filter((entry) => entry.location !== location),
    { location, level },
  ].sort((a, b) => a.location - b.location);
  owners[owner] = { ...state, knowledge };
  world.owners = { owners };
  return 'changed';
}

/** Applies a failure policy for an establishment guard (GDD-15.7). */
function applyEstablishmentFailure(
  world: World,
  unit: EntityId,
  order: TransportOrder,
  cursor: StationCursor,
  key: FailureKey,
): void {
  applyFailure(world, unit, order, cursor, key);
}

/** Advances the station cursor after a completed establishment. */
function advanceEstablishmentCursor(
  world: World,
  unit: EntityId,
  order: TransportOrder,
  cursor: StationCursor,
): void {
  advanceStationCursor(world, unit, order, cursor);
}

interface EstablishmentCost {
  readonly resource: DefinitionHandle;
  readonly quantity: number;
}

/** Parses the establishment costs into resolved resource handles. */
const establishmentCosts = (
  registry: Registry,
  data: Record<string, unknown>,
): EstablishmentCost[] => {
  const costs: EstablishmentCost[] = [];
  for (const raw of asCostArray(data['costs'])) {
    const record = asCostRecord(raw);
    const resourceId = typeof record?.['resource'] === 'string' ? record['resource'] : null;
    const quantity = record?.['quantity'];
    if (resourceId === null || typeof quantity !== 'number' || !Number.isInteger(quantity))
      continue;
    const handle = registry.handleOf('resource', resourceId as never);
    if (handle === null) continue;
    costs.push({ resource: handle, quantity });
  }
  return costs.sort((a, b) => a.resource - b.resource);
};

const asCostArray = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const asCostRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** True when the cargo covers every establishment cost. */
const cargoCovers = (cargo: Cargo, costs: readonly EstablishmentCost[]): boolean =>
  costs.every((cost) => cargoQuantity(cargo, cost.resource) >= cost.quantity);

/** Deducts the establishment costs from the cargo (resource-handle ascending). */
const deductCargo = (
  world: World,
  unit: EntityId,
  cargo: Cargo,
  costs: readonly EstablishmentCost[],
): void => {
  let entries = [...cargo.entries];
  let slots = [...cargo.slots];
  for (const cost of costs) {
    let remaining = cost.quantity;
    if (cargo.policy === 'typed_slots') {
      slots = slots.map((slot) => {
        if (slot.resource !== cost.resource || remaining <= 0 || slot === undefined) return slot;
        const take = Math.min(slot.quantity, remaining);
        remaining -= take;
        return { ...slot, quantity: slot.quantity - take };
      });
    }
    if (remaining > 0) {
      entries = entries.map((entry) => {
        if (entry.resource !== cost.resource || remaining <= 0) return entry;
        const take = Math.min(entry.quantity, remaining);
        remaining -= take;
        return { ...entry, quantity: entry.quantity - take };
      });
    }
  }
  world.stores
    .get<Cargo>('cargo')
    .set(unit, { ...cargo, entries: entries.filter((entry) => entry.quantity > 0), slots });
};

const establishmentDataOf = (
  registry: Registry,
  handle: DefinitionHandle,
): Record<string, unknown> | null => {
  const raw = registry.definitionDataOf?.('establishment', handle);
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : null;
};

/**
 * Executes establish orders for the tick's arrivals (phase 18, GDD-16.3).
 * Guards are checked before any mutation, so the transaction is atomic.
 *
 * Source: GDD-16.3, ARCH-14.4, ARCH-5.2
 */
export function runEstablishOrders(
  world: World,
  registry: Registry,
  scratch: TickScratch,
  events: EventWriter,
  system: EstablishmentSystem | null,
): boolean {
  const arrivals = readTransportArrivals(scratch);
  if (arrivals.length === 0) return false;
  let established = false;
  const locationStore = world.stores.get<Location>('location');
  const ownerStore = world.stores.get<{ owner: OwnerHandle }>('owner');
  for (const arrival of arrivals) {
    const assignment = assignmentOf(world, arrival.unit);
    if (assignment?.order == null) continue;
    const order = orderOf(world, assignment.order);
    if (order === undefined || order.mode !== 'establish') continue;
    const cursor = cursorOf(world, arrival.unit);
    if (cursor === undefined) continue;
    const station = order.stations[cursor.station];
    if (station === undefined || station.endpoint !== arrival.location) continue;
    const fail = (key: FailureKey): void =>
      applyEstablishmentFailure(world, arrival.unit, order, cursor, key);

    const owner = ownerStore.get(arrival.unit)?.owner;
    if (owner === undefined) {
      fail('origin_unavailable');
      continue;
    }
    const location = locationStore.get(arrival.location);
    if (location === undefined || location.establishment === undefined) {
      fail('origin_unavailable');
      continue;
    }
    const data = establishmentDataOf(registry, location.establishment);
    if (data === null) {
      fail('origin_unavailable');
      continue;
    }
    if (data['requires_unoccupied'] !== false && location.owner !== null) {
      fail('establishment_target_occupied');
      continue;
    }
    const required =
      typeof data['requires_knowledge'] === 'string' ? data['requires_knowledge'] : 'discovered';
    const current = world.owners.owners[owner]?.knowledge.find(
      (entry) => entry.location === arrival.location,
    )?.level;
    if ((KNOWLEDGE_RANK[current ?? 'unknown'] ?? 0) < (KNOWLEDGE_RANK[required] ?? 1)) {
      fail('origin_unavailable');
      continue;
    }
    const costs = establishmentCosts(registry, data);
    const cargo = world.stores.get<Cargo>('cargo').get(arrival.unit);
    if (cargo === undefined || !cargoCovers(cargo, costs)) {
      fail('origin_unavailable');
      continue;
    }
    if (system === null) {
      fail('origin_unavailable');
      continue;
    }
    const hub = system.createHub(world, arrival.location, owner, location.establishment);
    if (hub === null) {
      fail('origin_unavailable');
      continue;
    }
    deductCargo(world, arrival.unit, cargo, costs);
    locationStore.set(arrival.location, { ...location, owner, active: true });
    raiseKnowledge(world, owner, arrival.location, 'established');
    advanceEstablishmentCursor(world, arrival.unit, order, cursor);
    // The hub's components may feed the derived caches; rebuild in phase 04.
    world.caches.dirty = true;
    established = true;
    events.emit({
      type: 'LocationEstablished',
      subjects: [arrival.location],
      owner,
      location: arrival.location,
      payload: { owner, location: arrival.location, hub },
    });
  }
  return established;
}
