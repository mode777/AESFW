import { describe, expect, it } from 'vitest';
import type {
  EntityDetailDto,
  LocationDto,
  LocationSummaryDto,
  NeedBreakdownDto,
} from '@aesfw/protocol';
import { createI18n } from '../i18n/index.js';
import { entityInspector, inventoryRows, needRows, populationRows } from './index.js';

const i18n = createI18n({});

const detail = (overrides: Partial<EntityDetailDto> = {}): EntityDetailDto => ({
  entity_id: 3,
  definition_id: 'test.entity.producer',
  lifecycle: 'active',
  enabled: true,
  available_commands: ['SetEntityEnabled', 'SelectRecipe'],
  block_reasons: [],
  production: {
    recipe_id: 'test.recipe.a',
    state: 'processing',
    progress: 500,
    progress_scale: 1000,
    block_reasons: [],
  },
  ...overrides,
});

describe('[REF-12.3] entityInspector', () => {
  it('[REF-12.3] the inspector shows the recipe and progress', () => {
    const vm = entityInspector(detail(), i18n);
    expect(vm.rows.some((row) => row.value === 'test.recipe.a')).toBe(true);
    expect(vm.rows.some((row) => row.value === '50 %')).toBe(true);
  });

  it('[REF-12.3] the inspector lists the block reasons', () => {
    const vm = entityInspector(detail({ block_reasons: ['missing_input'] }), i18n);
    expect(vm.rows.some((row) => row.value === 'missing_input')).toBe(true);
  });
});

describe('[REF-12.3] needRows', () => {
  it('[REF-12.3] need rows are sorted by need ID', () => {
    const breakdown: NeedBreakdownDto[] = [
      {
        entity_id: 3,
        need_id: 'test.need.b',
        demand: 100,
        delivered: 50,
        fulfillment: 500,
        category: 'c',
        category_result: 500,
      },
      {
        entity_id: 3,
        need_id: 'test.need.a',
        demand: 100,
        delivered: 80,
        fulfillment: 800,
        category: 'c',
        category_result: 800,
      },
    ];
    const rows = needRows(breakdown, i18n);
    expect(rows.map((row) => row.need)).toEqual(['test.need.a', 'test.need.b']);
  });
});

describe('[REF-12.4] inventoryRows', () => {
  it('[REF-12.4] inventory rows carry stored and reserved', () => {
    const location: LocationDto = {
      entity_id: 1,
      inventories: [
        {
          inventory_id: 2,
          entries: [{ resource_id: 'test.resource.a', stored: 100, reserved: 20, capacity: 500 }],
        },
      ],
    };
    const rows = inventoryRows(location, i18n);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.stored).toBe(100);
    expect(rows[0]?.reserved).toBe(20);
  });
});

describe('[REF-12.4] populationRows', () => {
  it('[REF-12.4] population rows carry the tier total', () => {
    const summaries: LocationSummaryDto[] = [
      {
        entity_id: 1,
        knowledge: 'established',
        active: true,
        population_by_tier: { 'test.tier.a': 50 },
      },
    ];
    const rows = populationRows(summaries, i18n);
    expect(rows[0]?.tier).toBe('test.tier.a');
    expect(rows[0]?.count).toBe(50);
  });
});
