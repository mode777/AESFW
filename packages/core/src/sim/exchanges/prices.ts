/**
 * Exchange price state (02 §14.5, GDD-17.3). Prices are authoritative world
 * state; traded volume shifts them by fixed-point steps within a rolling
 * window and phase 28 recovers them toward their base prices. All arithmetic
 * is fixed-point integer; iteration is the ascending `(exchange, resource)`
 * order of the price table.
 *
 * Source: GDD-17.3, ARCH-14.5, TDS-6, TDS-23
 */
import type { Int } from '../../fx/index.js';
import { clamp, mulDiv } from '../../fx/index.js';
import type { DefinitionHandle, EntityId, Tick } from '../../ids/index.js';
import { tick as tickOf } from '../../ids/index.js';
import { InvariantViolation } from '../../errors/invariant-violation.js';
import type { Registry } from '../../registry/types.js';
import type { ExchangePrice, VolumeEntry, World } from '../../world/types.js';
import type { ExchangeConfig } from './config.js';
import type { ExchangeRef } from './config.js';
import { exchangeConfigOf } from './config.js';

/** The trade directions of an exchange good (GDD-17.4). */
export type TradeDirection = 'buy' | 'sell';

const asQuantity = (value: unknown): Int | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;

/** The price row of `(exchange, resource)`, or `null` when the good is not listed. */
export function exchangePriceOf(
  world: World,
  exchange: EntityId,
  resource: DefinitionHandle,
): ExchangePrice | null {
  for (const price of world.exchanges.prices) {
    if (price.exchange === exchange && price.resource === resource) return price;
  }
  return null;
}

/** The parsed configuration of the exchange entity behind `exchangeRef`. */
export function exchangeConfigOfEntity(
  registry: Registry,
  world: World,
  exchange: EntityId,
): ExchangeConfig | null {
  const component = world.stores.get<ExchangeRef>('exchangeRef').get(exchange);
  if (component === undefined) return null;
  return exchangeConfigOf(registry, component.exchange);
}

/** The first exchange entity at `location` in ascending entity order, or `null`. */
export function exchangeAtLocation(world: World, location: EntityId): EntityId | null {
  for (const entity of world.stores.get<ExchangeRef>('exchangeRef').ids()) {
    const component = world.stores.get<ExchangeRef>('exchangeRef').get(entity);
    if (component !== undefined && component.location === location) return entity;
  }
  return null;
}

/**
 * The volume of `entries` inside the `windowTicks` window ending at `atTick`
 * (GDD-17.3: traded "within `window_ticks`").
 *
 * Source: GDD-17.3
 */
export function windowVolume(entries: readonly VolumeEntry[], atTick: Tick, windowTicks: Int): Int {
  let total: Int = 0;
  for (const entry of entries) {
    if (entry.tick > atTick - windowTicks) total = total + entry.quantity;
  }
  return total;
}

/** Prunes entries older than the window and merges `quantity` into `atTick`. */
function mergeEntry(
  entries: readonly VolumeEntry[],
  atTick: Tick,
  windowTicks: Int,
  quantity: Int,
): readonly VolumeEntry[] {
  const kept = entries.filter((entry) => entry.tick > atTick - windowTicks);
  const last = kept[kept.length - 1];
  if (last !== undefined && last.tick === atTick) {
    return [...kept.slice(0, -1), { tick: atTick, quantity: last.quantity + quantity }];
  }
  return [...kept, { tick: atTick, quantity }];
}

/** The base price and clamp bounds of one direction (GDD-17.3). */
export function priceSideBounds(
  config: ExchangeConfig,
  resource: DefinitionHandle,
  direction: TradeDirection,
): { readonly base: Int; readonly min: Int; readonly max: Int } {
  const good = config.goods.find((entry) => entry.resource === resource);
  if (good === undefined) {
    throw new InvariantViolation('unknown_exchange_good', { resource: String(resource) });
  }
  const base = direction === 'buy' ? good.baseBuy : good.baseSell;
  return {
    base,
    min: mulDiv(base, config.elasticity.minPricePermille, 1000, 'floor'),
    max: mulDiv(base, config.elasticity.maxPricePermille, 1000, 'floor'),
  };
}

/** One elasticity step of `base`: the permille fraction, at least 1 when configured. */
export function stepAmount(config: ExchangeConfig, base: Int): Int {
  const amount = mulDiv(base, config.elasticity.stepChangePermille, 1000, 'floor');
  return config.elasticity.stepChangePermille > 0 && amount < 1 ? 1 : amount;
}

/** One recovery step of `base`: the permille fraction, at least 1 when configured. */
export function recoveryAmount(config: ExchangeConfig, base: Int): Int {
  const amount = mulDiv(base, config.elasticity.recoveryPermillePerInterval, 1000, 'floor');
  return config.elasticity.recoveryPermillePerInterval > 0 && amount < 1 ? 1 : amount;
}

/** Whether the good's price side is enabled for the direction (GDD-17.2). */
export function sideEnabled(
  config: ExchangeConfig,
  resource: DefinitionHandle,
  direction: TradeDirection,
): boolean {
  const good = config.goods.find((entry) => entry.resource === resource);
  if (good === undefined) return false;
  return direction === 'buy' ? good.buyEnabled : good.sellEnabled;
}

const replaceRow = (world: World, updated: ExchangePrice): void => {
  world.exchanges = {
    prices: world.exchanges.prices.map((price) =>
      price.exchange === updated.exchange && price.resource === updated.resource ? updated : price,
    ),
  };
};

/**
 * Records traded volume and applies the elasticity steps (GDD-17.3). Sold
 * volume lowers the sell price and bought volume raises the buy price; every
 * whole `step_quantity` of in-window volume moves the direction's price by one
 * step amount, clamped to the configured bounds. The world's price table is
 * replaced with the updated row.
 *
 * Source: GDD-17.3, ARCH-14.5
 */
export function recordExchangeVolume(
  world: World,
  registry: Registry,
  exchange: EntityId,
  resource: DefinitionHandle,
  direction: TradeDirection,
  quantity: unknown,
  atTick: Tick,
): ExchangePrice {
  const recorded = asQuantity(quantity);
  if (recorded === null) {
    throw new InvariantViolation('invalid_quantity', { quantity: String(quantity) });
  }
  const row = exchangePriceOf(world, exchange, resource);
  if (row === null) {
    throw new InvariantViolation('unknown_exchange_good', {
      exchange: String(exchange),
      resource: String(resource),
    });
  }
  const config = exchangeConfigOfEntity(registry, world, exchange);
  if (config === null) {
    throw new InvariantViolation('unknown_exchange_config', { exchange: String(exchange) });
  }
  const windowTicks = config.elasticity.windowTicks;
  const { min, max, base } = priceSideBounds(config, resource, direction);
  const traded = direction === 'sell' ? row.soldVolume : row.boughtVolume;
  const other = direction === 'sell' ? row.boughtVolume : row.soldVolume;
  const volumeBefore = windowVolume(traded, atTick, windowTicks);
  const updatedTraded = mergeEntry(traded, atTick, windowTicks, recorded);
  const volumeAfter = windowVolume(updatedTraded, atTick, windowTicks);
  const steps =
    Math.floor(volumeAfter / config.elasticity.stepQuantity) -
    Math.floor(volumeBefore / config.elasticity.stepQuantity);
  const step = stepAmount(config, base) * steps;
  const current = direction === 'sell' ? row.sell : row.buy;
  const moved = direction === 'sell' ? current - step : current + step;
  const adjusted = {
    ...row,
    ...(direction === 'sell'
      ? { sell: clamp(moved, min, max), soldVolume: updatedTraded }
      : { buy: clamp(moved, min, max), boughtVolume: updatedTraded }),
  };
  if (direction === 'sell') {
    adjusted.boughtVolume = mergeEntry(other, atTick, windowTicks, 0);
  } else {
    adjusted.soldVolume = mergeEntry(other, atTick, windowTicks, 0);
  }
  replaceRow(world, adjusted);
  return adjusted;
}

/**
 * Phase 28 — recovery (GDD-17.3, ARCH-14.5). Prunes both windows of every
 * price row to `window_ticks`, and when `tick` is aligned to
 * `recovery_interval_ticks`, moves each price toward its own base price by the
 * recovery step without passing it, still clamped to the configured bounds.
 *
 * Source: GDD-17.3, ARCH-14.5
 */
export function recoverExchangePrices(world: World, registry: Registry, currentTick: Tick): void {
  if (world.exchanges.prices.length === 0) return;
  const configCache = new Map<EntityId, ExchangeConfig | null>();
  const configOf = (exchange: EntityId): ExchangeConfig | null => {
    const cached = configCache.get(exchange);
    if (cached !== undefined) return cached;
    const resolved = exchangeConfigOfEntity(registry, world, exchange);
    configCache.set(exchange, resolved);
    return resolved;
  };
  const now = tickOf(currentTick);
  const prices: ExchangePrice[] = [];
  let mutated = false;
  for (const row of world.exchanges.prices) {
    const config = configOf(row.exchange);
    if (config === null) {
      prices.push(row);
      continue;
    }
    const windowTicks = config.elasticity.windowTicks;
    const soldVolume = row.soldVolume.filter((entry) => entry.tick > now - windowTicks);
    const boughtVolume = row.boughtVolume.filter((entry) => entry.tick > now - windowTicks);
    let buy = row.buy;
    let sell = row.sell;
    if (now % config.elasticity.recoveryIntervalTicks === 0) {
      const buySide = priceSideBounds(config, row.resource, 'buy');
      const sellSide = priceSideBounds(config, row.resource, 'sell');
      const buyStep = recoveryAmount(config, buySide.base);
      const sellStep = recoveryAmount(config, sellSide.base);
      buy =
        buy > buySide.base
          ? Math.max(buySide.base, buy - buyStep)
          : buy < buySide.base
            ? Math.min(buySide.base, buy + buyStep)
            : buy;
      sell =
        sell > sellSide.base
          ? Math.max(sellSide.base, sell - sellStep)
          : sell < sellSide.base
            ? Math.min(sellSide.base, sell + sellStep)
            : sell;
      buy = clamp(buy, buySide.min, buySide.max);
      sell = clamp(sell, sellSide.min, sellSide.max);
    }
    const changed =
      buy !== row.buy ||
      sell !== row.sell ||
      soldVolume.length !== row.soldVolume.length ||
      boughtVolume.length !== row.boughtVolume.length;
    if (changed) mutated = true;
    prices.push(changed ? { ...row, buy, sell, soldVolume, boughtVolume } : row);
  }
  if (mutated) world.exchanges = { prices };
}
