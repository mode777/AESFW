/**
 * Unit tests for the transition eligibility read model (PIC-10.1, GDD-13.1).
 *
 * Source: PIC-10.1, GDD-13.1, TDS-14.3
 */
import { describe, expect, it } from 'vitest';
import { ids } from '@aesfw/core';
import type { PopulationGroup, Residence, Satisfaction } from '@aesfw/core';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { createSession } from '../session/session.js';
import { entityDetail } from './entity-detail.js';

const IDS: Record<string, number> = {
  'test.location.a': 1,
  'test.tier.a': 3,
  'test.tier.b': 4,
  'test.entity.residence': 9,
  'test.entity.residence_b': 10,
  'test.condition.ready': 11,
  'test.transition.up': 12,
};

const conditionData = {
  id: 'test.condition.ready',
  expression: {
    all: [
      {
        sustained: {
          ticks: 3,
          condition: { greater_equal: { left: { population_count: 'current_entity' }, right: 1 } },
        },
      },
      { greater_equal: { left: 1, right: 1 } },
    ],
  },
};

const registry: ContentRegistry = {
  stringIdOf: (type, handle) => {
    for (const [id, value] of Object.entries(IDS)) {
      if (value === handle && id.startsWith(`test.${type}`)) return ids.stringId(id);
    }
    return null;
  },
  handleOf: (type, id) => {
    const value = IDS[id as string];
    return value === undefined ? null : ids.definitionHandle(value);
  },
  definitionOf: (type, handle) =>
    type === 'condition' && handle === ids.definitionHandle(11)
      ? {
          id: 'test.condition.ready',
          handle: ids.definitionHandle(11),
          type: 'condition',
          data: conditionData as never,
        }
      : null,
  definitionsOf: (type) =>
    type === 'condition'
      ? [
          {
            id: 'test.condition.ready',
            handle: ids.definitionHandle(11),
            type: 'condition',
            data: conditionData,
          },
        ]
      : [],
  tagsOf: () => [],
  handlesOf: (type) => (type === 'transition' ? [ids.definitionHandle(12)] : []),
  definitionDataOf: (type, handle) => {
    if (type === 'condition' && handle === ids.definitionHandle(11)) return conditionData;
    if (type === 'transition' && handle === ids.definitionHandle(12)) {
      return {
        id: 'test.transition.up',
        source_tier: 'test.tier.a',
        target_tier: 'test.tier.b',
        condition: 'test.condition.ready',
        duration_ticks: 1,
        conversion: { population: 'retain_count', entity_definition: 'test.entity.residence_b' },
      };
    }
    if (type === 'tier' && handle === ids.definitionHandle(3)) {
      return { id: 'test.tier.a', need_categories: [], outputs: [] };
    }
    if (type === 'tier' && handle === ids.definitionHandle(4)) {
      return { id: 'test.tier.b', need_categories: [], outputs: [] };
    }
    if (type === 'entity' && handle === ids.definitionHandle(10)) {
      return {
        id: 'test.entity.residence_b',
        components: {
          residence: {
            population_tier: 'test.tier.b',
            capacity: 100,
            growth_policy: 'test.growth.a',
          },
        },
      };
    }
    return null;
  },
};

const content: CompiledContent = {
  registry,
  checksum: 'checksum.1',
  packages: [],
  presentation: null,
};

const session = (progress: number) => {
  const created = createSession(content, {
    sessionId: 'session.1',
    seed: [1, 2],
    tickDurationMs: 100,
    world: null,
    enabledModules: [],
    hashInterval: 0,
    journal: false,
    actor: ids.ownerHandle(0),
    actorId: 'test.owner.1',
  });
  if (!created.ok) throw new Error('session creation failed');
  const state = created.value;
  const entity = ids.entityId(3);
  state.world.stores.get<Residence>('residence').set(entity, {
    tier: ids.definitionHandle(3),
    capacity: 100,
    location: null,
    growthPolicy: null,
    consumptionFactor: 1000,
    outputs: [],
    needs: [],
    categories: [],
    satisfactionAggregation: 'average',
  });
  state.world.stores
    .get<PopulationGroup>('populationGroup')
    .set(entity, { tier: ids.definitionHandle(3), count: 10, capacity: 100 });
  state.world.stores.get<Satisfaction>('satisfaction').set(entity, { z: 800, categories: [] });
  state.world.timers = {
    timers: [
      {
        condition: ids.definitionHandle(11),
        slot: 0,
        subject: entity,
        consecutiveTrueTicks: progress,
      },
    ],
  };
  return state;
};

describe('[PIC-10.1][GDD-13.1] transition eligibility', () => {
  it('[PIC-10.1] reports sustained progress below the threshold as ineligible', () => {
    const detail = entityDetail(session(2), 3);
    const eligibility = detail?.residence?.transition_eligibility ?? [];
    expect(eligibility).toHaveLength(1);
    expect(eligibility[0]?.transition_id).toBe('test.transition.up');
    expect(eligibility[0]?.eligible).toBe(false);
    expect(eligibility[0]?.conditions[0]).toMatchObject({
      kind: 'sustained',
      condition_id: 'test.condition.ready',
      ticks: 3,
      progress: 2,
      met: false,
    });
  });

  it('[PIC-10.1] reports sustained progress at the threshold as eligible', () => {
    const detail = entityDetail(session(3), 3);
    const eligibility = detail?.residence?.transition_eligibility ?? [];
    expect(eligibility[0]?.eligible).toBe(true);
    expect(eligibility[0]?.conditions[0]?.met).toBe(true);
  });
});
