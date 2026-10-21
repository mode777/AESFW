import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';

import { EntityDefinitionSchema } from './entity.js';
import { LocationTemplateSchema } from './location.js';
import { NeedCategorySchema, NeedSchema } from './need.js';
import { GrowthPolicySchema, PopulationTierSchema } from './population.js';
import { RecipeSchema } from './recipe.js';
import { ResourceSchema } from './resource.js';

const valid = (schema: Parameters<typeof Value.Check>[0], value: unknown) =>
  Value.Check(schema, value);

describe('[CONT-6.1][CONT-6.2] resource schema', () => {
  it('[CONT-6.2] a capability resource validates', () => {
    expect(
      valid(ResourceSchema, {
        id: 'test.capability.tier_1',
        tags: ['virtual', 'capability'],
        quantity: { precision: 'integer', scale: 1 },
        storage: { policy: 'recomputed', scope: 'location' },
        transportable: false,
      }),
    ).toBe(true);
  });

  it('[CONT-6.1] a resource with an unknown field is rejected', () => {
    expect(
      valid(ResourceSchema, {
        id: 'test.resource.a',
        quantity: { precision: 'fixed', scale: 1000 },
        storage: { policy: 'normal', scope: 'inventory' },
        transportable: true,
        wibble: 1,
      }),
    ).toBe(false);
  });

  it('[CONT-6.1] a resource with an invalid scale is rejected', () => {
    expect(
      valid(ResourceSchema, {
        id: 'test.resource.a',
        quantity: { precision: 'fixed', scale: 0 },
        storage: { policy: 'normal', scope: 'inventory' },
        transportable: true,
      }),
    ).toBe(false);
  });
});

describe('[CONT-6.4] location template schema', () => {
  const template = {
    id: 'test.location.a',
    spatial_policy: 'framework.spatial.abstract_capacity',
    spatial_parameters: { total_capacity: 100 },
    inventories: [
      {
        id: 'shared',
        capacity: { mode: 'total', quantity: 1000000 },
        access_policy: 'framework.inventory.shared_location',
      },
    ],
    activation: { initial: true },
  };

  it('[CONT-6.4] an abstract-capacity location template validates', () => {
    expect(valid(LocationTemplateSchema, template)).toBe(true);
  });

  it('[CONT-6.4] a location template without activation is rejected', () => {
    expect(valid(LocationTemplateSchema, { ...template, activation: undefined })).toBe(false);
  });
});

describe('[CONT-6.7] recipe schema', () => {
  it('[CONT-6.7] a batch recipe validates', () => {
    expect(
      valid(RecipeSchema, {
        id: 'test.recipe.need',
        mode: 'batch',
        duration_ticks: 10,
        inputs: [{ resource: 'test.resource.source', quantity: 1000 }],
        outputs: [{ resource: 'test.resource.need', quantity: 1000 }],
        capability_requirements: [{ resource: 'test.capability.tier_1', quantity: 1 }],
      }),
    ).toBe(true);
  });

  it('[CONT-6.7] a recipe with a non-positive duration is rejected', () => {
    expect(
      valid(RecipeSchema, {
        id: 'test.recipe.need',
        mode: 'batch',
        duration_ticks: 0,
        inputs: [],
        outputs: [],
      }),
    ).toBe(false);
  });
});

describe('[CONT-6.8][CONT-6.9] entity definition schema', () => {
  it('[CONT-6.8] a producer entity definition validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.producer',
        components: {
          producer: {
            recipes: ['test.recipe.need'],
            process_slots: 1,
            input_inventory: 'location.shared',
            output_inventory: 'location.shared',
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.9] a residence entity definition validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.residence',
        components: {
          residence: {
            population_tier: 'test.population.tier_1',
            capacity: 10,
            initial_population: 1,
            growth_policy: 'test.growth.default',
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] an unknown component is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.producer',
        components: { teleporter: {} },
      }),
    ).toBe(false);
  });
});

describe('[CONT-6.10] population tier schema', () => {
  it('[CONT-6.10] a population tier validates', () => {
    expect(
      valid(PopulationTierSchema, {
        id: 'test.population.tier_1',
        need_categories: ['test.need_category.base'],
        outputs: [
          {
            resource: 'test.capability.tier_1',
            scope: 'location',
            rate_per_population_per_tick: 1,
          },
        ],
      }),
    ).toBe(true);
  });

  it('[CONT-6.10] a tier output with a negative rate is rejected', () => {
    expect(
      valid(PopulationTierSchema, {
        id: 'test.population.tier_1',
        need_categories: ['test.need_category.base'],
        outputs: [
          {
            resource: 'test.capability.tier_1',
            scope: 'location',
            rate_per_population_per_tick: -1,
          },
        ],
      }),
    ).toBe(false);
  });
});

describe('[CONT-6.11] need schema', () => {
  it('[CONT-6.11] a resource-consumption need validates', () => {
    expect(
      valid(NeedSchema, {
        id: 'test.need.base',
        category: 'test.need_category.base',
        applies_to: ['test.population.tier_1'],
        demand: {
          type: 'resource_consumption',
          resource: 'test.resource.need',
          quantity_per_population_per_tick: 1,
        },
        fulfillment: { measurement_window_ticks: 10, target_ratio: 1000 },
      }),
    ).toBe(true);
  });

  it('[CONT-6.11] a resource-availability need validates', () => {
    expect(
      valid(NeedSchema, {
        id: 'test.need.availability',
        category: 'test.need_category.base',
        applies_to: ['test.population.tier_1'],
        demand: {
          type: 'resource_availability',
          resource: 'test.resource.need',
          minimum_quantity: 10000,
        },
        fulfillment: { measurement_window_ticks: 10, target_ratio: 1000 },
      }),
    ).toBe(true);
  });

  it('[CONT-6.11] an unknown demand type is rejected', () => {
    expect(
      valid(NeedSchema, {
        id: 'test.need.base',
        category: 'test.need_category.base',
        applies_to: ['test.population.tier_1'],
        demand: { type: 'telepathy', resource: 'test.resource.need' },
        fulfillment: { measurement_window_ticks: 10, target_ratio: 1000 },
      }),
    ).toBe(false);
  });
});

describe('[CONT-6.13] need category schema', () => {
  it('[CONT-6.13] a weighted-score need category validates', () => {
    expect(
      valid(NeedCategorySchema, {
        id: 'test.need_category.base',
        evaluation: { mode: 'weighted_score', required_score: 1000 },
        members: [{ need: 'test.need.base', weight: 1000 }],
      }),
    ).toBe(true);
  });

  it('[CONT-6.13] an all-mode need category validates', () => {
    expect(
      valid(NeedCategorySchema, {
        id: 'test.need_category.base',
        evaluation: { mode: 'all' },
        members: [{ need: 'test.need.base', weight: 1000 }],
      }),
    ).toBe(true);
  });
});

describe('[CONT-6.14] growth policy schema', () => {
  it('[CONT-6.14] a growth policy with increase and decrease validates', () => {
    expect(
      valid(GrowthPolicySchema, {
        id: 'test.growth.default',
        interval_ticks: 10,
        increase: { quantity: 1, condition: 'test.condition.grow' },
        decrease: { quantity: 1, condition: 'test.condition.decline' },
      }),
    ).toBe(true);
  });

  it('[CONT-6.14] a growth policy with a zero interval is rejected', () => {
    expect(
      valid(GrowthPolicySchema, {
        id: 'test.growth.default',
        interval_ticks: 0,
        increase: { quantity: 1, condition: 'test.condition.grow' },
      }),
    ).toBe(false);
  });
});
