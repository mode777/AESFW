import { Value } from '@sinclair/typebox/value';
import { describe, expect, it } from 'vitest';

import { ConnectionDefinitionSchema } from './connection.js';
import { EntityDefinitionSchema } from './entity.js';
import { LocationTemplateSchema } from './location.js';
import { NeedCategorySchema, NeedSchema } from './need.js';
import { GrowthPolicySchema, PopulationTierSchema } from './population.js';
import { RecipeSchema } from './recipe.js';
import { ResourceSchema } from './resource.js';
import { TransportUnitSchema } from './transport.js';
import { WorldDefinitionSchema } from './world.js';

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

  it('[CONT-6.4] a location template with source slots validates', () => {
    expect(
      valid(LocationTemplateSchema, {
        ...template,
        source_slots: [{ type: 'test.slot.a', count: 2 }],
      }),
    ).toBe(true);
  });

  it('[CONT-6.4] a negative slot count is rejected', () => {
    expect(
      valid(LocationTemplateSchema, {
        ...template,
        source_slots: [{ type: 'test.slot.a', count: -1 }],
      }),
    ).toBe(false);
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

  it('[CONT-6.8] a storage provider entity definition validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.storage',
        components: {
          storage_provider: {
            inventory: 'location.shared',
            capacity: { total: 1800000 },
            throughput: 2000,
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] a negative storage-provider throughput is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.storage',
        components: {
          storage_provider: { inventory: 'location.shared', throughput: -1 },
        },
      }),
    ).toBe(false);
  });

  it('[CONT-6.8] an unknown storage-provider field is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.storage',
        components: {
          storage_provider: { inventory: 'location.shared', accepts: [] },
        },
      }),
    ).toBe(false);
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

  it('[CONT-6.8] a construction component validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.builder',
        components: {
          construction: {
            duration_ticks: 10,
            costs: [{ resource: 'test.resource.build', quantity: 5000 }],
            commit_policy: 'completion',
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] an unknown commit policy is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.builder',
        components: {
          construction: {
            duration_ticks: 10,
            costs: [],
            commit_policy: 'whenever',
          },
        },
      }),
    ).toBe(false);
  });

  it('[CONT-6.8] a placement component validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.builder',
        components: {
          placement: {
            capacity_cost: 10,
            footprint: [2, 2],
            conditions: 'test.condition.place_ok',
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] a placement with a condition list validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.builder',
        components: {
          placement: {
            footprint: [1, 1],
            conditions: ['test.condition.place_ok'],
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] a negative capacity cost is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.builder',
        components: { placement: { capacity_cost: -1 } },
      }),
    ).toBe(false);
  });

  it('[CONT-6.8] an area extractor entity definition validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.area_extractor',
        components: {
          placement: { footprint: [3, 3], working_area: { cells: 12, exclusive: true } },
          resource_source: {
            policy: 'area_dependent',
            outputs: [{ resource: 'test.resource.a', quantity_per_tick: 66 }],
            scale_by_property: 'test.property.suitability',
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] a slot extractor entity definition validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.slot_extractor',
        components: {
          placement: { footprint: [3, 3], requires_slot: 'test.slot.a' },
          resource_source: {
            policy: 'slot_dependent',
            depletion: 'none',
            outputs: [{ resource: 'test.resource.a', quantity_per_tick: 66 }],
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] a regenerating source entity definition validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.regenerating_source',
        components: {
          resource_source: {
            policy: 'regenerating_deposit',
            initial_quantity: 1000,
            regeneration_per_tick: 100,
            maximum_quantity: 1000,
            outputs: [{ resource: 'test.resource.a', quantity_per_tick: 100 }],
          },
        },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] an unknown source policy is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.source',
        components: { resource_source: { policy: 'magic', outputs: [] } },
      }),
    ).toBe(false);
  });

  it('[CONT-6.8] a connectivity requirement component validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.refiner',
        components: { connectivity: { requires: 'test.connectivity.hub' } },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] a connectivity provider component validates', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.connector',
        components: { connectivity: { provides: 'test.connectivity.hub' } },
      }),
    ).toBe(true);
  });

  it('[CONT-6.8] a connectivity component with both roles is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.connector',
        components: {
          connectivity: { requires: 'test.connectivity.hub', provides: 'test.connectivity.hub' },
        },
      }),
    ).toBe(false);
  });

  it('[CONT-6.8] a connectivity component with neither role is rejected', () => {
    expect(
      valid(EntityDefinitionSchema, {
        id: 'test.entity.connector',
        components: { connectivity: {} },
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

describe('[CONT-6.5] connection definition schema', () => {
  const connection = {
    id: 'test.connection.standard',
    direction: 'bidirectional',
    traversal: { base_duration_ticks: 100 },
    allowed_transport_tags: ['test.transport.standard'],
  };

  it('[CONT-6.5] a bidirectional connection definition validates', () => {
    expect(valid(ConnectionDefinitionSchema, connection)).toBe(true);
  });

  it('[CONT-6.5] a connection definition without a traversal duration is rejected', () => {
    expect(
      valid(ConnectionDefinitionSchema, {
        ...connection,
        traversal: {},
      }),
    ).toBe(false);
  });
});

describe('[CONT-6.6] world definition schema', () => {
  const world = {
    id: 'test.world.prototype',
    locations: [
      { id: 'test.loc.a', template: 'test.location.a' },
      { id: 'test.loc.b', template: 'test.location.a' },
    ],
    connections: [
      {
        id: 'test.conn.a_b',
        definition: 'test.connection.standard',
        origin: 'test.loc.a',
        destination: 'test.loc.b',
      },
    ],
    owners: [
      {
        id: 'owner.a',
        initial_resources: [{ resource: 'test.resource.a', quantity: 1000 }],
        established_locations: ['test.loc.a'],
      },
    ],
  };

  it('[CONT-6.6] a world definition validates', () => {
    expect(valid(WorldDefinitionSchema, world)).toBe(true);
  });

  it('[CONT-6.6] a world definition with no locations is rejected', () => {
    expect(valid(WorldDefinitionSchema, { ...world, locations: [] })).toBe(false);
  });
});

describe('[CONT-6.16] transport unit schema', () => {
  const unit = {
    id: 'test.transport.basic',
    entity_definition: 'test.entity.transport',
    cargo: {
      compartment_policy: 'typed_slots',
      slots: 2,
      slot_capacity: 50000,
      acceptance: 'transportable_resources',
    },
    movement: { speed_permille: 1000, allowed_connection_tags: ['test.transport.standard'] },
    handling: { loading_rate_per_tick: 10000, unloading_rate_per_tick: 10000 },
    order_modes: ['route'],
  };

  it('[CONT-6.16] a transport unit validates', () => {
    expect(valid(TransportUnitSchema, unit)).toBe(true);
  });

  it('[CONT-6.16] a transport unit with an unknown compartment policy is rejected', () => {
    expect(
      valid(TransportUnitSchema, {
        ...unit,
        cargo: { ...unit.cargo, compartment_policy: 'containers' },
      }),
    ).toBe(false);
  });
});
