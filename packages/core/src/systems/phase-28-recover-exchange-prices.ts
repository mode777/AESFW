/**
 * Phase 28 — recoverExchangePrices (TDS-11.1, GDD-17.3). Prunes the volume
 * windows of every exchange price row and recovers prices toward their base
 * prices on the configured interval.
 *
 * Source: TDS-11.1, GDD-17.3, ARCH-14.5
 */
import { recoverExchangePrices } from '../sim/exchanges/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase28RecoverExchangePrices: SystemDescriptor = {
  phase: 28,
  name: 'recoverExchangePrices',
  reads: ['exchangeRef'],
  writes: ['exchanges'],
  run: (ctx) => {
    recoverExchangePrices(ctx.world, ctx.registry, ctx.tick);
  },
};
