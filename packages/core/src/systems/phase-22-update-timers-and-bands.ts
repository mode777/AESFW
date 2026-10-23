/**
 * Phase 22 — updateTimersAndBands (TDS-11.1, TDS-14.3). Updates sustained
 * timers through the injected updater; satisfaction bands are added by 7.2.
 *
 * Source: TDS-11.1, TDS-14.3, ARCH-5.2
 */
import { updateBands } from '../sim/population/index.js';
import type { SystemDescriptor } from '../pipeline/types.js';

export const phase22UpdateTimersAndBands: SystemDescriptor = {
  phase: 22,
  name: 'updateTimersAndBands',
  reads: ['timers', 'residence', 'satisfaction', 'bandState'],
  writes: ['timers', 'bandState'],
  run: (ctx) => {
    ctx.sustainedTimerUpdater(ctx);
    updateBands(ctx.world, ctx.registry);
  },
};
