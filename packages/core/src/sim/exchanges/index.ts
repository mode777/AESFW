/**
 * Exchange price state (M9.1). Exchanges are fixed trading counterparties
 * with authoritative, elasticity-bound price state.
 *
 * Source: GDD-17.1–17.3, ARCH-14.5, CONT-6.21
 */
export type { ExchangeConfig, ExchangeElasticityConfig, ExchangeGoodConfig } from './config.js';
export { exchangeConfigOf } from './config.js';
export type { TradeDirection } from './prices.js';
export type { VolumeEntry } from '../../world/types.js';
export {
  exchangeConfigOfEntity,
  exchangePriceOf,
  priceSideBounds,
  recordExchangeVolume,
  recoverExchangePrices,
  recoveryAmount,
  stepAmount,
  windowVolume,
} from './prices.js';
