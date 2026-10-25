/**
 * Exchange quotes read model (PIC-10.7). Derived from the authoritative price
 * state and the exchange definition through the registry; never written back.
 * Quotes are informative: trades always execute at the authoritative price of
 * the executing tick.
 *
 * Source: PIC-10.7, ARCH-14.5, TDS-18.4
 */
import type { Registry, VolumeEntry } from '@aesfw/core';
import {
  exchangeConfigOfEntity,
  exchangePriceOf,
  priceSideBounds,
  readWorld,
  recoveryAmount,
  windowVolume,
} from '@aesfw/core';
import type { ExchangeGoodQuoteDto, ExchangeQuotesDto } from '@aesfw/protocol';
import type { SessionState } from '../session/types.js';

const resourceId = (registry: Registry, handle: number): string =>
  registry.stringIdOf('resource', handle as never) ?? `resource.${handle}`;

/** Ticks until `price` reaches `base` at the configured recovery rate. */
const recoveryTicks = (
  session: SessionState,
  config: ReturnType<typeof exchangeConfigOfEntity>,
  base: number,
  price: number,
): number | undefined => {
  if (config === null || price === base) return 0;
  const permille = config.elasticity.recoveryPermillePerInterval;
  if (permille <= 0) return undefined;
  const step = recoveryAmount(config, base);
  if (step <= 0) return undefined;
  const intervals = Math.ceil(Math.abs(price - base) / step);
  const ticks = intervals * config.elasticity.recoveryIntervalTicks;
  return ticks > 0 ? ticks : undefined;
};

const volumeOf = (entries: readonly VolumeEntry[], atTick: number, windowTicks: number): number =>
  windowVolume(entries, atTick as never, windowTicks);

/**
 * Builds the exchange-quotes DTO for one exchange entity (PIC-10.7), or null
 * when the entity is not an exchange or the actor does not know its location.
 *
 * Source: PIC-10.7, PIC-9.3
 */
export const exchangeQuotes = (
  session: SessionState,
  actor: number,
  exchange: number,
): ExchangeQuotesDto | null => {
  const registry = session.content.registry;
  const config = exchangeConfigOfEntity(registry, session.world, exchange as never);
  if (config === null) return null;
  const exchangeRefComponent = session.world.stores
    .get<{ exchange: number; location: number }>('exchangeRef')
    .get(exchange as never);
  if (exchangeRefComponent === undefined) return null;
  // Fog (PIC-9.3, ARCH-8.3): quotes are location-bound economic data.
  const reader = readWorld(session.world, registry);
  const exchangeLocation = exchangeRefComponent.location;
  if (
    session.settings.fog &&
    reader.knowledge(actor as never, exchangeLocation as never) === 'unknown'
  ) {
    return null;
  }
  const location = session.world.stores
    .get<{ region: number | null }>('location')
    .get(exchangeLocation as never);
  const region =
    location?.region == null
      ? undefined
      : (registry.stringIdOf('location', location.region as never) ?? `region.${location.region}`);
  const currency = config.currency;
  const now = session.world.tick;
  const goods: ExchangeGoodQuoteDto[] = config.goods.flatMap((good) => {
    const row = exchangePriceOf(session.world, exchange as never, good.resource);
    if (row === undefined || row === null) return [];
    const buySide = priceSideBounds(config, good.resource, 'buy');
    const sellSide = priceSideBounds(config, good.resource, 'sell');
    const window = config.elasticity.windowTicks;
    const quote: {
      resource_id: string;
      buy: number;
      sell: number;
      base_buy: number;
      base_sell: number;
      recent_sold: number;
      recent_bought: number;
      buy_recovery_ticks?: number;
      sell_recovery_ticks?: number;
    } = {
      resource_id: resourceId(registry, good.resource),
      buy: row.buy,
      sell: row.sell,
      base_buy: buySide.base,
      base_sell: sellSide.base,
      recent_sold: volumeOf(row.soldVolume, now, window),
      recent_bought: volumeOf(row.boughtVolume, now, window),
    };
    const buyRecovery = recoveryTicks(session, config, buySide.base, row.buy);
    if (buyRecovery !== undefined) quote.buy_recovery_ticks = buyRecovery;
    const sellRecovery = recoveryTicks(session, config, sellSide.base, row.sell);
    if (sellRecovery !== undefined) quote.sell_recovery_ticks = sellRecovery;
    return [quote];
  });
  return {
    entity_id: exchange,
    location_id: exchangeLocation,
    ...(region === undefined ? {} : { region_id: region }),
    currency_id: resourceId(registry, currency),
    revision: session.revision,
    goods,
  };
};
