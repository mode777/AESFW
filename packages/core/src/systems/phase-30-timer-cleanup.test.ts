/**
 * Unit tests for the phase 30 sustained-timer cleanup (TDS-14.3).
 *
 * Source: TDS-14.3
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '../world/create.js';
import { createEmptyRegistry } from '../registry/types.js';
import { definitionHandle, entityId } from '../ids/index.js';
import { runPhases } from '../testing.js';
import type { SustainedTimerUpdater } from '../index.js';
import type { World } from '../world/types.js';

const registry = createEmptyRegistry();

const world = (): World => {
  const created = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  return created.value;
};

describe('[TDS-14.3] phase 30 timer cleanup', () => {
  it('[TDS-14.3] a removed subject loses its timer rows', () => {
    const worldState = world();
    worldState.stores.get('enabled').set(entityId(1), { enabled: true });
    worldState.timers = {
      timers: [
        { condition: definitionHandle(1), slot: 0, subject: entityId(1), consecutiveTrueTicks: 4 },
        { condition: definitionHandle(1), slot: 0, subject: entityId(2), consecutiveTrueTicks: 7 },
      ],
    };
    // Phase 22 keeps both rows; entity 2 then loses its only component.
    const keep: SustainedTimerUpdater = (ctx) => {
      ctx.world.timers = {
        timers: ctx.world.timers.timers.map((timer) => ({
          ...timer,
          consecutiveTrueTicks: timer.consecutiveTrueTicks + 1,
        })),
      };
    };
    runPhases(worldState, registry, [22], {
      commands: [],
      options: { journal: false, hash: false },
      sustainedTimerUpdater: keep,
    });
    worldState.stores.get('lifecycle').set(entityId(2), { lifecycle: 'cancelled' });
    runPhases(worldState, registry, [30], {
      commands: [],
      options: { journal: false, hash: false },
    });
    expect(worldState.timers.timers).toEqual([
      { condition: definitionHandle(1), slot: 0, subject: entityId(1), consecutiveTrueTicks: 5 },
    ]);
  });
});
