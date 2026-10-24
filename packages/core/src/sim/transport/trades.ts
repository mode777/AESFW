/**
 * Trade execution (GDD-17.4, ARCH-14.4). Phase 17 executes the staged `buy`
 * and `sell` actions of docked transport units against the exchange's
 * authoritative price state: price limits and side enablement are checked
 * against the order's failure policy, one atomic transaction moves the
 * owner's currency and the unit's cargo together, the executed volume feeds
 * the elasticity windows, and a `Traded` event is emitted. Trades apply in
 * ascending exchange, owner, and unit order within the tick.
 *
 * Source: GDD-17.4, ARCH-14.4, ARCH-14.5
 */
import type { Int } from '../../fx/index.js';
import { MAX_SAFE_INT } from '../../fx/index.js';
import type { EntityId, OwnerHandle, Tick } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { EventWriter } from '../../events/event-writer.js';
import type { TickScratch } from '../../pipeline/types.js';
import type { TransactionWriter } from '../../tx/index.js';
import type { World } from '../../world/types.js';
import {
  exchangeConfigOfEntity,
  exchangePriceOf,
  recordExchangeVolume,
  sideEnabled,
} from '../exchanges/index.js';
import { loadCargo, unloadCargo } from './cargo.js';
import {
  advanceAction,
  applyFailure,
  clearMovement,
  currentAction,
  cursorOf,
  orderOf,
  readTransportHandling,
} from './orders.js';
import type {
  Cargo,
  FailureKey,
  PendingTransportTransfer,
  StationCursor,
  TransportMovement,
} from './types.js';
import { TRANSPORT_HANDLING_KEY } from './types.js';

const ownerOf = (world: World, unit: EntityId): OwnerHandle | null =>
  world.stores.get<{ owner: OwnerHandle }>('owner').get(unit)?.owner ?? null;

/** The unit's current location, or `null` when unknown. */
const locationOf = (world: World, unit: EntityId): EntityId | null =>
  world.stores.get<TransportMovement>('movement').get(unit)?.location ?? null;

/** The price limit of the staged action, read from the order's station spec. */
const priceLimitOf = (world: World, entry: PendingTransportTransfer): Int | undefined => {
  const order = orderOf(world, entry.order);
  const cursor = cursorOf(world, entry.unit);
  if (order === undefined || cursor === undefined) return undefined;
  return currentAction(order, cursor)?.action.priceLimit;
};

/** Applies the order's failure policy for `key` to the staged unit. */
const failTrade = (world: World, entry: PendingTransportTransfer, key: FailureKey): void => {
  const order = orderOf(world, entry.order);
  const cursor = cursorOf(world, entry.unit);
  if (order === undefined || cursor === undefined) return;
  applyFailure(world, entry.unit, order, cursor, key);
};

/** Completes a fully handled trade action, advancing the station cursor. */
const completeTrade = (world: World, entry: PendingTransportTransfer): void => {
  const order = orderOf(world, entry.order);
  const cursor = cursorOf(world, entry.unit);
  if (order === undefined || cursor === undefined) return;
  if (cursor.handled < cursor.target) return;
  const next = advanceAction(world, entry.unit, order, cursor);
  world.stores.get<StationCursor>('stationCursor').set(entry.unit, next);
  const movement = world.stores.get<TransportMovement>('movement').get(entry.unit);
  if (movement !== undefined) {
    world.stores.get<TransportMovement>('movement').set(entry.unit, clearMovement(movement));
  }
};

/** Executes one staged trade. */
const executeTrade = (
  world: World,
  registry: Registry,
  tx: TransactionWriter,
  events: EventWriter,
  currentTick: Tick,
  entry: PendingTransportTransfer,
): void => {
  const exchange = entry.exchange;
  const owner = ownerOf(world, entry.unit);
  if (exchange === null || owner === null) return;
  const direction = entry.action === 'buy' ? 'buy' : 'sell';
  const config = exchangeConfigOfEntity(registry, world, exchange);
  const row = exchangePriceOf(world, exchange, entry.resource);
  if (config === null || row === null || !sideEnabled(config, entry.resource, direction)) {
    failTrade(world, entry, 'exchange_limit_not_met');
    return;
  }
  const price = direction === 'buy' ? row.buy : row.sell;
  const limit = priceLimitOf(world, entry);
  if (limit !== undefined && (direction === 'sell' ? price < limit : price > limit)) {
    failTrade(world, entry, 'exchange_limit_not_met');
    return;
  }
  if (price <= 0 || entry.quantity <= 0 || price > MAX_SAFE_INT / entry.quantity) {
    failTrade(world, entry, 'origin_unavailable');
    return;
  }
  const location = locationOf(world, entry.unit);
  const result = tx.atomic((builder) => {
    builder.trade({
      exchange,
      owner,
      unit: entry.unit,
      resource: entry.resource,
      currency: config.currency,
      quantity: entry.quantity,
      price,
      direction,
    });
  });
  if (!result.ok) {
    failTrade(world, entry, 'origin_unavailable');
    return;
  }
  const cargoStore = world.stores.get<Cargo>('cargo');
  const cargo = cargoStore.get(entry.unit);
  if (cargo !== undefined) {
    const moved =
      direction === 'buy'
        ? loadCargo(cargo, entry.resource, entry.quantity)
        : unloadCargo(cargo, entry.resource, entry.quantity);
    cargoStore.set(entry.unit, moved.cargo);
  }
  recordExchangeVolume(
    world,
    registry,
    exchange,
    entry.resource,
    direction,
    entry.quantity,
    currentTick,
  );
  events.emit({
    type: 'Traded',
    subjects: [entry.unit],
    owner,
    location,
    payload: {
      exchange,
      resource: entry.resource,
      quantity: entry.quantity,
      price,
      direction,
    },
  });
  completeTrade(world, entry);
};

/**
 * Executes the staged trades of the tick (phase 17) and leaves the plain
 * handling entries for phase 19.
 *
 * Source: GDD-17.4, ARCH-14.4
 */
export function executeTrades(
  world: World,
  registry: Registry,
  tx: TransactionWriter,
  scratch: TickScratch,
  events: EventWriter,
  currentTick: Tick,
): void {
  const staged = readTransportHandling(scratch);
  const trades = staged.filter((entry) => entry.action === 'buy' || entry.action === 'sell');
  if (trades.length === 0) return;
  const rest = staged.filter((entry) => entry.action !== 'buy' && entry.action !== 'sell');
  const withOwner = trades.map((entry) => ({
    entry,
    exchange: entry.exchange ?? 0,
    owner: ownerOf(world, entry.unit) ?? 0,
  }));
  withOwner.sort(
    (a, b) => a.exchange - b.exchange || a.owner - b.owner || a.entry.unit - b.entry.unit,
  );
  for (const { entry } of withOwner) {
    executeTrade(world, registry, tx, events, currentTick, entry);
  }
  scratch.values.set(TRANSPORT_HANDLING_KEY, rest);
}
