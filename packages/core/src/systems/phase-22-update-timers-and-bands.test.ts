/**
 * Unit tests for phase 22 updateTimersAndBands (TDS-14.3), the phase 30 timer
 * cleanup, and timer persistence (TDS-14.3, ARCH-15.1).
 *
 * Source: TDS-14.3, ARCH-5.2, ARCH-15.1
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '../world/create.js';
import { createEmptyRegistry } from '../registry/types.js';
import { definitionHandle, entityId, stringId } from '../ids/index.js';
import { cloneWorld, decodeWorld, encodeWorld, step } from '../index.js';
import { hashWorld } from '../world/codec.js';
import { runPhases } from '../testing.js';
import type { Registry, SustainedTimerUpdater, TickContext } from '../index.js';
import type { World } from '../world/types.js';

const registry: Registry = {
  ...createEmptyRegistry(),
  stringIdOf: (type, handle) =>
    type === 'condition' && handle === definitionHandle(1) ? stringId('test.condition.a') : null,
  handleOf: (type, id) =>
    type === 'condition' && id === stringId('test.condition.a') ? definitionHandle(1) : null,
};

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

/** An updater that emulates phase 22 work over a fixed subject set. */
const scriptedUpdater =
  (subjects: readonly number[], holds: (ctx: TickContext) => boolean): SustainedTimerUpdater =>
  (ctx) => {
    const rows = subjects.map((subject) => ({
      condition: definitionHandle(1),
      slot: 0,
      subject: entityId(subject),
      consecutiveTrueTicks: holds(ctx)
        ? (ctx.world.timers.timers.find((timer) => timer.subject === subject)
            ?.consecutiveTrueTicks ?? 0) + 1
        : 0,
    }));
    ctx.world.timers = { timers: rows };
  };

const input = (updater: SustainedTimerUpdater) => ({
  commands: [],
  options: { journal: false, hash: false },
  sustainedTimerUpdater: updater,
});

describe('[TDS-14.3] phase 22 updateTimersAndBands', () => {
  it('[TDS-14.3] the injected updater runs in phase order', () => {
    const worldState = world();
    let calls = 0;
    const updater: SustainedTimerUpdater = (ctx) => {
      calls += 1;
      ctx.world.timers = {
        timers: [
          {
            condition: definitionHandle(1),
            slot: 0,
            subject: entityId(1),
            consecutiveTrueTicks: calls,
          },
        ],
      };
    };
    runPhases(worldState, registry, [22], input(updater));
    runPhases(worldState, registry, [22], input(updater));
    expect(calls).toBe(2);
    expect(worldState.timers.timers[0]?.consecutiveTrueTicks).toBe(2);
  });

  it('[TDS-14.3] the default updater is a no-op', () => {
    const worldState = world();
    step(worldState, registry, { commands: [], options: { journal: false, hash: false } });
    expect(worldState.timers.timers).toEqual([]);
  });

  it('[ARCH-15.1][TDS-14.3] timers persist through save, load, and continue', () => {
    const worldState = world();
    runPhases(worldState, registry, [22], input(scriptedUpdater([1], () => true)));
    runPhases(worldState, registry, [22], input(scriptedUpdater([1], () => true)));
    expect(worldState.timers.timers[0]?.consecutiveTrueTicks).toBe(2);

    const encoded = encodeWorld(worldState, registry);
    const decoded = decodeWorld(registry, encoded);
    if (!decoded.ok) throw new Error('decode failed');
    runPhases(decoded.value, registry, [22], input(scriptedUpdater([1], () => true)));
    expect(decoded.value.timers.timers[0]?.consecutiveTrueTicks).toBe(3);

    const uninterrupted = world();
    runPhases(uninterrupted, registry, [22], input(scriptedUpdater([1], () => true)));
    runPhases(uninterrupted, registry, [22], input(scriptedUpdater([1], () => true)));
    runPhases(uninterrupted, registry, [22], input(scriptedUpdater([1], () => true)));
    expect(hashWorld(decoded.value, registry)).toBe(hashWorld(uninterrupted, registry));
  });

  it('[TDS-14.3] a cloned world carries its timers', () => {
    const worldState = world();
    runPhases(worldState, registry, [22], input(scriptedUpdater([1], () => true)));
    const clone = cloneWorld(worldState);
    expect(clone.timers).toEqual(worldState.timers);
  });
});
