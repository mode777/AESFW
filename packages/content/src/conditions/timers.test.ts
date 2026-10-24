/**
 * Unit tests for the phase 22 sustained-timer updater (TDS-14.3).
 *
 * Source: TDS-14.3
 */
import { describe, expect, it } from 'vitest';

import { createWorld } from '@aesfw/core';
import { createTransactionWriter, txEnvironmentFor } from '@aesfw/core';
import { ids } from '@aesfw/core';
import type { ResourceSource, Tick, TickContext } from '@aesfw/core';
import type { CompiledContent, JsonValue } from '../types.js';
import type { Registry, SustainedTimerUpdater, World } from '@aesfw/core';
import { buildRegistry } from '../registry/build.js';
import { buildSustainedTimerUpdater } from './timers.js';

const SUSTAINED_EXPRESSION: JsonValue = {
  sustained: {
    ticks: 3,
    condition: {
      greater_equal: { left: { population_count: 'current_entity' }, right: 1 },
    },
  },
};

interface Built {
  readonly content: CompiledContent;
  readonly registry: Registry;
  readonly handle: number;
}

/** Compiles one sustained condition through the real registry pipeline. */
const build = (): Built => {
  const built = buildRegistry({
    conditions: [{ id: 'test.condition.sustained', expression: SUSTAINED_EXPRESSION }],
  });
  const handle = built.registry.handleOf('condition', ids.stringId('test.condition.sustained'));
  if (handle === null) throw new Error('condition handle missing');
  return {
    content: { registry: built.registry, checksum: '', packages: [], presentation: null },
    registry: built.registry,
    handle,
  };
};

const worldWithSources = (registry: Registry, entities: readonly number[]): World => {
  const created = createWorld(registry, {
    seed: [0, 0],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) throw new Error('world creation failed');
  const worldState = created.value;
  for (const entity of entities) {
    worldState.stores.get<ResourceSource>('resourceSource').set(ids.entityId(entity), {
      policy: 'infinite_rate',
      location: null,
      inventory: null,
      outputs: [],
    });
  }
  return worldState;
};

const setCondition = (worldState: World, handle: number, entities: readonly number[]): void => {
  for (const entity of entities) {
    const store = worldState.stores.get<ResourceSource>('resourceSource');
    const source = store.get(ids.entityId(entity));
    if (source === undefined) continue;
    store.set(ids.entityId(entity), { ...source, condition: ids.definitionHandle(handle) });
  }
};

const stepTimers = (
  worldState: World,
  registry: Registry,
  updater: SustainedTimerUpdater,
  ticks: number,
): void => {
  for (let index = 0; index < ticks; index += 1) {
    const context: TickContext = {
      tick: (index + 1) as Tick,
      registry,
      world: worldState,
      tx: createTransactionWriter(worldState, null, txEnvironmentFor(registry)),
      events: { emit: () => undefined, events: [] },
      scratch: { values: new Map() },
      policies: {},
      conditionEvaluator: () => true,
      sustainedTimerUpdater: () => undefined,
      unlockSystem: null,
      establishmentSystem: null,
    };
    updater(context);
  }
};

describe('[TDS-14.3] sustained timer updater', () => {
  it('[TDS-14.3] a continuously true inner expression accumulates per tick', () => {
    const { content, registry, handle } = build();
    const worldState = worldWithSources(registry, [1]);
    setCondition(worldState, handle, [1]);
    const updater = buildSustainedTimerUpdater(content, () => 1);

    stepTimers(worldState, registry, updater, 3);
    expect(worldState.timers.timers).toEqual([
      { condition: handle, slot: 0, subject: 1, consecutiveTrueTicks: 3 },
    ]);
  });

  it('[TDS-14.3] a false inner expression resets the timer to zero', () => {
    const { content, registry, handle } = build();
    const worldState = worldWithSources(registry, [1]);
    setCondition(worldState, handle, [1]);
    let population = 1;
    const updater = buildSustainedTimerUpdater(content, () => population);

    stepTimers(worldState, registry, updater, 2);
    expect(worldState.timers.timers[0]?.consecutiveTrueTicks).toBe(2);

    population = 0;
    stepTimers(worldState, registry, updater, 1);
    expect(worldState.timers.timers).toEqual([
      { condition: handle, slot: 0, subject: 1, consecutiveTrueTicks: 0 },
    ]);

    population = 1;
    stepTimers(worldState, registry, updater, 1);
    expect(worldState.timers.timers[0]?.consecutiveTrueTicks).toBe(1);
  });

  it('[TDS-14.3] subjects are updated in ascending (condition, slot, subject) order', () => {
    const { content, registry, handle } = build();
    const worldState = worldWithSources(registry, [5, 2]);
    setCondition(worldState, handle, [5, 2]);
    const updater = buildSustainedTimerUpdater(content, () => 1);

    stepTimers(worldState, registry, updater, 1);
    expect(worldState.timers.timers.map((timer) => timer.subject)).toEqual([2, 5]);
    expect(worldState.timers.timers.every((timer) => timer.condition === handle)).toBe(true);
  });

  it('[TDS-14.3] a condition without sustained nodes produces no updater work', () => {
    const built = buildRegistry({
      conditions: [{ id: 'test.condition.plain', expression: true }],
    });
    const content: CompiledContent = {
      registry: built.registry,
      checksum: '',
      packages: [],
      presentation: null,
    };
    const worldState = worldWithSources(built.registry, [1]);
    const updater = buildSustainedTimerUpdater(content);
    stepTimers(worldState, built.registry, updater, 2);
    expect(worldState.timers.timers).toEqual([]);
  });
});

describe('[TDS-14.3][GDD-19] owner-scoped sustained timers', () => {
  it('[TDS-14.3] an unlock condition advances a timer keyed by the owner', () => {
    const built = buildRegistry({
      conditions: [
        {
          id: 'test.condition.unlock',
          expression: {
            sustained: {
              ticks: 2,
              condition: {
                greater_equal: { left: { population_count: { scope: 'owner' } }, right: 1 },
              },
            },
          },
        },
      ],
      unlocks: [
        {
          id: 'test.unlock.a',
          scope: 'owner',
          targets: [{ type: 'recipe', id: 'test.recipe.a' }],
          condition: 'test.condition.unlock',
        },
      ],
      recipes: [{ id: 'test.recipe.a', mode: 'batch', duration_ticks: 1, inputs: [], outputs: [] }],
    });
    const content: CompiledContent = {
      registry: built.registry,
      checksum: '',
      packages: [],
      presentation: null,
    };
    const worldState = worldWithSources(built.registry, []);
    worldState.owners = {
      owners: [
        {
          handle: ids.ownerHandle(0),
          knowledge: [],
          accounts: [],
          purposeLocks: [],
          unlocks: [],
          deficitPaused: [],
        },
      ],
    };
    const updater = buildSustainedTimerUpdater(
      content,
      () => 0,
      () => 3,
    );
    const context = (): TickContext => ({
      tick: 1 as never,
      registry: built.registry,
      world: worldState,
      tx: createTransactionWriter(worldState, null, txEnvironmentFor(built.registry)),
      events: { emit: () => undefined, events: [] },
      scratch: { values: new Map() },
      policies: {},
      conditionEvaluator: () => true,
      sustainedTimerUpdater: () => undefined,
      unlockSystem: null,
      establishmentSystem: null,
    });
    updater(context());
    updater(context());
    expect(worldState.timers.timers).toEqual([
      {
        condition: ids.definitionHandle(0),
        slot: 0,
        subject: ids.entityId(0),
        consecutiveTrueTicks: 2,
      },
    ]);
  });
});
