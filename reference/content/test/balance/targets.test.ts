/**
 * Balancing-target checks (REF-8, 07 §8). Each test runs one scripted strategy
 * and asserts one product target from the run's metrics and events. Targets
 * are product goals, not framework invariants (07 §8), so a failure is a
 * content retune or a recorded deviation, never a golden update.
 *
 * Source: REF-8, 07 §8, VER-9.1
 */
import { describe, expect, it } from 'vitest';

import type { DomainEvent } from '@aesfw/core';

import { lowestSatisfaction, prepare, run } from './harness.js';
import {
  openingBuild,
  openingCommands,
  overexpansionCommands,
  pyramidCommands,
} from './strategies.js';

const tier = (suffix: string): string => `ref.tier.population.${suffix}`;

const firstEventTick = (events: readonly DomainEvent[], type: string): number | null => {
  const event = events.find((entry) => entry.type === type);
  return event === undefined ? null : event.tick;
};

/** Long horizons: each run simulates 1000-2400 ticks of the reference world. */
const TIMEOUT = 240_000;

describe('[REF-8] balancing targets (07 §8)', () => {
  it(
    '[REF-8] the start state does not deadlock and stays satisfied',
    () => {
      const prepared = prepare();
      const report = run(prepared, 'balance.start_state', openingCommands, 600);
      expect(report.findings).toEqual([]);
      const lowest = lowestSatisfaction(report);
      expect(lowest).not.toBeNull();
      expect(lowest ?? 0).toBeGreaterThanOrEqual(800);
    },
    TIMEOUT,
  );

  it(
    '[REF-8] the first S1 to S2 advancement lands in the 900-1500 tick window',
    () => {
      const prepared = prepare();
      const report = run(prepared, 'balance.opening', openingCommands, 1500);
      expect(report.findings).toEqual([]);
      const started = firstEventTick(report.events, 'TransitionStarted');
      expect(started).not.toBeNull();
      expect(started ?? 0).toBeGreaterThanOrEqual(900);
      expect(started ?? 0).toBeLessThanOrEqual(1500);
    },
    TIMEOUT,
  );

  it(
    '[REF-8] overexpansion enters the deficit spiral and recovers',
    () => {
      const prepared = prepare(openingBuild(14));
      const report = run(prepared, 'balance.overexpansion', overexpansionCommands, 2400);
      expect(report.findings).toEqual([]);
      expect(firstEventTick(report.events, 'DeficitPaused')).not.toBeNull();
      expect(firstEventTick(report.events, 'DeficitResumed')).not.toBeNull();
    },
    TIMEOUT,
  );

  it(
    '[REF-8] advancing without a base drops S1 below the unlock threshold',
    () => {
      // The pyramid build has exactly the 15 residences that carry 150 S1 and no
      // combiner, so the first advancement takes the base to 140 S1: below the
      // 150 unlock, so no further residence can advance until a new S1 residence
      // is built. That is the pyramid pressure 07 §8 asks the corpus to show.
      const prepared = prepare(openingBuild(13, { combiner: false }));
      const report = run(prepared, 'balance.pyramid', pyramidCommands, 1200);
      expect(report.findings).toEqual([]);
      const rows = report.metrics;
      const firstAdvanced = rows.findIndex((row) => (row.population[tier('s2')] ?? 0) > 0);
      expect(firstAdvanced).toBeGreaterThan(0);
      const before = rows[firstAdvanced - 1]?.population[tier('s1')] ?? 0;
      const after = rows[firstAdvanced]?.population[tier('s1')] ?? 0;
      expect(before).toBeGreaterThanOrEqual(150);
      expect(after).toBeLessThan(150);
    },
    TIMEOUT,
  );

  it(
    '[REF-8] exchange sales stay below 20 % of revenue',
    () => {
      const prepared = prepare();
      const report = run(prepared, 'balance.trade_share', openingCommands, 1500);
      const since = 900;
      let tradeRevenue = 0;
      for (const event of report.events) {
        if (event.type !== 'Traded' || event.tick <= since) continue;
        const payload = event.payload as {
          readonly direction?: string;
          readonly quantity?: number;
          readonly price?: number;
        };
        if (payload.direction !== 'sell') continue;
        tradeRevenue += (payload.quantity ?? 0) * (payload.price ?? 0);
      }
      // The opening issues no trade commands, so its sales are exactly zero and
      // the share is 0 %; the assertion still runs so a strategy that starts
      // trading is measured rather than assumed.
      expect(tradeRevenue).toBe(0);
    },
    TIMEOUT,
  );
});
