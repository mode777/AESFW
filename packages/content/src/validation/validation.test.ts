/**
 * Unit tests for the graph-validation stage (CONT-11.4, CONT-11.5): one test
 * per spec scenario, built through the real loader on in-memory sources.
 *
 * Source: CONT-11.4, CONT-11.5, VER-5.3
 */
import { describe, expect, it } from 'vitest';

import { composeDefinitions } from '../composition/compose.js';
import { createMemorySource } from '../package/source.js';
import { loadContent } from '../registry/load.js';
import { validateCompositionCompatibility } from './composition.js';

const manifestYaml = (files: readonly string[]): string =>
  [
    'package:',
    '  id: test.game',
    '  version: 1.0.0',
    '  schema_version: 1',
    '  type: simulation_content',
    '  files:',
    ...files.map((file) => `    - ${file}`),
  ].join('\n') + '\n';

const load = (document: unknown) =>
  loadContent(
    [
      createMemorySource('test.game', {
        'package.yaml': manifestYaml(['content.yaml']),
        'content.yaml': JSON.stringify(document),
      }),
    ],
    { strictness: 'strict' },
  );

const codes = (result: { readonly diagnostics: readonly { readonly code: string }[] }) =>
  result.diagnostics.map((diagnostic) => diagnostic.code);

const resource = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  tags: ['storable'],
  quantity: { precision: 'fixed', scale: 1000 },
  storage: { policy: 'normal', scope: 'inventory' },
  transportable: true,
  ...overrides,
});

const recipe = (id: string, inputs: readonly string[], outputs: readonly string[]) => ({
  id,
  mode: 'batch',
  duration_ticks: 10,
  inputs: inputs.map((r) => ({ resource: r, quantity: 1000 })),
  outputs: outputs.map((r) => ({ resource: r, quantity: 1000 })),
});

const producerEntity = (id: string, recipes: readonly string[], extra: object = {}) => ({
  id,
  components: {
    producer: {
      recipes,
      process_slots: 1,
      input_inventory: 'location.shared',
      output_inventory: 'location.shared',
    },
    ...extra,
  },
});

const sourceEntity = (id: string, resource: string) => ({
  id,
  components: {
    resource_source: {
      policy: 'infinite_rate',
      outputs: [{ resource, quantity_per_tick: 100 }],
    },
  },
});

const template = (id: string) => ({
  id,
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
});

const world = (
  id: string,
  locations: readonly string[],
  connections: readonly object[] = [],
  entities: readonly object[] = [],
) => ({
  id,
  locations: locations.map((templateId, index) => ({
    id: `test.loc.${index}`,
    template: templateId,
  })),
  ...(connections.length > 0 ? { connections } : {}),
  owners: entities.length > 0 ? [{ id: 'test.owner', initial_entities: entities }] : [],
});

describe('[CONT-11.4][CONT-11.5] validation stage placement', () => {
  it('[CONT-11.4][CONT-12] a valid package passes the graph stage', () => {
    const result = load({
      resources: [resource('test.resource.a'), resource('test.resource.out')],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], ['test.resource.out'])],
      entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
      location_templates: [template('test.location.a')],
      worlds: [world('test.world', ['test.location.a'])],
    });
    expect(
      codes(result).filter((code) => code.endsWith('_resource') || code.endsWith('_storage')),
    ).toEqual([]);
    expect(result.content).not.toBeNull();
  });

  it('[CONT-11.5][CONT-12] a graph error fails the load', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      recipes: [recipe('test.recipe.a', ['test.resource.absent'], [])],
      entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
      location_templates: [template('test.location.a')],
      worlds: [world('test.world', ['test.location.a'])],
    });
    expect(codes(result)).toContain('unsourceable_resource');
    expect(result.content).toBeNull();
  });
});

describe('[CONT-11.4] composition compatibility', () => {
  it('[CONT-11.4] a merge that removes a required field is reported', () => {
    const composed = composeDefinitions({
      unlocks: [
        {
          id: 'test.unlock.a',
          scope: 'global',
          targets: { remove: ['test.entity.base'] },
          condition: 'test.condition.a',
        },
      ],
    }).definitions;
    const diagnostics = validateCompositionCompatibility(composed);
    const finding = diagnostics.find((d) => d.code === 'composition_schema_violation');
    expect(finding?.definition).toBe('test.unlock.a');
  });

  it('[CONT-11.4] a producer without recipes is reported', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      entity_definitions: [producerEntity('test.entity.p', [])],
    });
    expect(codes(result)).toContain('incompatible_components');
  });

  it('[CONT-11.4] a service provider without a capability resource is reported', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      services: [{ id: 'test.service.a' }],
      entity_definitions: [
        {
          id: 'test.entity.sp',
          components: {
            service_provider: {
              mode: 'capacity',
              service: 'test.service.a',
              capability: 'test.resource.a',
              quantity_per_tick: 10,
            },
          },
        },
      ],
    });
    expect(codes(result)).toContain('incompatible_components');
  });
});

describe('[CONT-11.5] production graph', () => {
  it('[CONT-11.5] a consumed resource with no source is reported', () => {
    const result = load({
      resources: [resource('test.resource.a'), resource('test.resource.out')],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], ['test.resource.out'])],
      entity_definitions: [producerEntity('test.entity.p', ['test.recipe.a'])],
      location_templates: [template('test.location.a')],
      worlds: [
        world(
          'test.world',
          ['test.location.a'],
          [],
          [{ definition: 'test.entity.p', location: 'test.loc.0' }],
        ),
      ],
    });
    const finding = result.diagnostics.find((d) => d.code === 'unsourceable_resource');
    expect(finding?.args).toMatchObject({ resource: 'test.resource.a' });
  });

  it('[CONT-11.5] a fully sourced package passes', () => {
    const result = load({
      resources: [resource('test.resource.a'), resource('test.resource.out')],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], ['test.resource.out'])],
      entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
      location_templates: [template('test.location.a')],
      worlds: [world('test.world', ['test.location.a'])],
    });
    expect(codes(result)).not.toContain('unsourceable_resource');
  });

  it('[CONT-11.5] an owner-scoped balance is exempt', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.credits', {
          tags: ['balance'],
          storage: { policy: 'normal', scope: 'owner' },
          allow_negative: true,
        }),
      ],
      entity_definitions: [
        sourceEntity('test.entity.src', 'test.resource.a'),
        {
          id: 'test.entity.paying',
          components: {
            maintenance: {
              interval_ticks: 10,
              inputs: [{ resource: 'test.resource.credits', quantity: 100 }],
              charge_policy: 'while_exists',
              shortage_policy: 'ignore',
            },
          },
        },
      ],
      location_templates: [template('test.location.a')],
      worlds: [world('test.world', ['test.location.a'])],
    });
    expect(codes(result)).not.toContain('unsourceable_resource');
  });

  it('[CONT-11.5] a definition library without worlds is not judged', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], [])],
    });
    expect(codes(result)).not.toContain('unsourceable_resource');
  });

  it('[CONT-11.5] a seeded recipe cycle is accepted', () => {
    const result = load({
      resources: [resource('test.resource.a'), resource('test.resource.b')],
      recipes: [
        recipe('test.recipe.a', ['test.resource.b'], ['test.resource.a']),
        recipe('test.recipe.b', ['test.resource.a'], ['test.resource.b']),
      ],
      entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
      location_templates: [template('test.location.a')],
      worlds: [world('test.world', ['test.location.a'])],
    });
    expect(codes(result)).not.toContain('recipe_cycle_unseeded');
  });

  it('[CONT-11.5] an unseeded recipe cycle is reported', () => {
    const result = load({
      resources: [resource('test.resource.a'), resource('test.resource.b')],
      recipes: [
        recipe('test.recipe.a', ['test.resource.b'], ['test.resource.a']),
        recipe('test.recipe.b', ['test.resource.a'], ['test.resource.b']),
      ],
      location_templates: [template('test.location.a')],
      worlds: [world('test.world', ['test.location.a'])],
    });
    const finding = result.diagnostics.find((d) => d.code === 'recipe_cycle_unseeded');
    expect(finding).toBeDefined();
    expect(finding?.definition).toBe('test.recipe.a');
  });

  it('[CONT-11.5] a recomputed output is reported', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.cap', {
          tags: ['virtual', 'capability'],
          quantity: { precision: 'integer', scale: 1 },
          storage: { policy: 'recomputed', scope: 'location' },
          transportable: false,
        }),
      ],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], ['test.resource.cap'])],
      entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
      location_templates: [template('test.location.a')],
      worlds: [world('test.world', ['test.location.a'])],
    });
    const finding = result.diagnostics.find((d) => d.code === 'invalid_output_storage');
    expect(finding?.definition).toBe('test.recipe.a');
  });
});

describe('[CONT-11.5] population graph', () => {
  const tier = (id: string) => ({ id, need_categories: [], outputs: [] });
  const residence = (id: string, tierId: string) => ({
    id,
    components: {
      residence: {
        population_tier: tierId,
        capacity: 10,
        growth_policy: 'test.growth.none',
      },
    },
  });

  it('[CONT-11.5] a reachable transition chain passes', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      growth_policies: [{ id: 'test.growth.none', interval_ticks: 10 }],
      population_tiers: [tier('test.tier.1'), tier('test.tier.2'), tier('test.tier.3')],
      transitions: [
        {
          id: 'test.transition.a',
          source_tier: 'test.tier.1',
          target_tier: 'test.tier.2',
          duration_ticks: 5,
          conversion: { population: 'retain_count' },
        },
        {
          id: 'test.transition.b',
          source_tier: 'test.tier.2',
          target_tier: 'test.tier.3',
          duration_ticks: 5,
          conversion: { population: 'retain_count' },
        },
      ],
      entity_definitions: [residence('test.entity.res1', 'test.tier.1')],
    });
    expect(codes(result)).not.toContain('transition_unreachable');
  });

  it('[CONT-11.5] an orphan transition is reported', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      growth_policies: [{ id: 'test.growth.none', interval_ticks: 10 }],
      population_tiers: [
        tier('test.tier.1'),
        tier('test.tier.2'),
        tier('test.tier.orphan_a'),
        tier('test.tier.orphan_b'),
      ],
      transitions: [
        {
          id: 'test.transition.ok',
          source_tier: 'test.tier.1',
          target_tier: 'test.tier.2',
          duration_ticks: 5,
          conversion: { population: 'retain_count' },
        },
        {
          id: 'test.transition.orphan',
          source_tier: 'test.tier.orphan_a',
          target_tier: 'test.tier.orphan_b',
          duration_ticks: 5,
          conversion: { population: 'retain_count' },
        },
      ],
      entity_definitions: [residence('test.entity.res1', 'test.tier.1')],
    });
    const finding = result.diagnostics.find((d) => d.code === 'transition_unreachable');
    expect(finding?.definition).toBe('test.transition.orphan');
  });

  it('[CONT-11.5] an optional orphan transition is accepted', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      growth_policies: [{ id: 'test.growth.none', interval_ticks: 10 }],
      population_tiers: [
        tier('test.tier.1'),
        tier('test.tier.2'),
        tier('test.tier.orphan_a'),
        tier('test.tier.orphan_b'),
      ],
      transitions: [
        {
          id: 'test.transition.ok',
          source_tier: 'test.tier.1',
          target_tier: 'test.tier.2',
          duration_ticks: 5,
          conversion: { population: 'retain_count' },
        },
        {
          id: 'test.transition.orphan',
          source_tier: 'test.tier.orphan_a',
          target_tier: 'test.tier.orphan_b',
          duration_ticks: 5,
          conversion: { population: 'retain_count' },
          optional: true,
        },
      ],
      entity_definitions: [residence('test.entity.res1', 'test.tier.1')],
    });
    expect(codes(result)).not.toContain('transition_unreachable');
  });
});

describe('[CONT-11.5] spatial and logistics graph', () => {
  it('[CONT-11.5] a non-transportable resource consumed elsewhere is reported', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.heavy', { transportable: false }),
      ],
      entity_definitions: [
        sourceEntity('test.entity.src', 'test.resource.a'),
        producerEntity('test.entity.p', ['test.recipe.a']),
        sourceEntity('test.entity.heavy', 'test.resource.heavy'),
      ],
      recipes: [recipe('test.recipe.a', ['test.resource.heavy'], ['test.resource.out'])],
      location_templates: [template('test.location.a'), template('test.location.b')],
      worlds: [
        world(
          'test.world',
          ['test.location.a', 'test.location.b'],
          [
            {
              id: 'test.connection.main',
              definition: 'test.connection.def',
              origin: 'test.loc.0',
              destination: 'test.loc.1',
            },
          ],
          [
            { definition: 'test.entity.p', location: 'test.loc.1' },
            { definition: 'test.entity.src', location: 'test.loc.0' },
            { definition: 'test.entity.heavy', location: 'test.loc.0' },
          ],
        ),
      ],
      connections: [
        {
          id: 'test.connection.def',
          direction: 'bidirectional',
          traversal: { base_duration_ticks: 5 },
        },
      ],
    });
    const finding = result.diagnostics.find((d) => d.code === 'resource_unreachable');
    expect(finding?.args).toMatchObject({ resource: 'test.resource.heavy' });
  });

  it('[CONT-11.5] a reachable transported resource passes', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      entity_definitions: [
        producerEntity('test.entity.p', ['test.recipe.a']),
        sourceEntity('test.entity.src', 'test.resource.a'),
      ],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], ['test.resource.out'])],
      location_templates: [template('test.location.a'), template('test.location.b')],
      worlds: [
        world(
          'test.world',
          ['test.location.a', 'test.location.b'],
          [
            {
              id: 'test.connection.main',
              definition: 'test.connection.def',
              origin: 'test.loc.0',
              destination: 'test.loc.1',
            },
          ],
          [
            { definition: 'test.entity.p', location: 'test.loc.1' },
            { definition: 'test.entity.src', location: 'test.loc.0' },
          ],
        ),
      ],
      connections: [
        {
          id: 'test.connection.def',
          direction: 'bidirectional',
          traversal: { base_duration_ticks: 5 },
        },
      ],
      transport_units: [
        {
          id: 'test.transport.a',
          entity_definition: 'test.entity.src',
          cargo: {
            compartment_policy: 'unrestricted',
            slots: 1,
            slot_capacity: 100,
            acceptance: 'transportable_resources',
          },
          movement: { speed_permille: 500 },
          handling: { loading_rate_per_tick: 10, unloading_rate_per_tick: 10 },
        },
      ],
    });
    expect(codes(result)).not.toContain('resource_unreachable');
    expect(codes(result)).not.toContain('transport_tag_mismatch');
  });

  it('[CONT-11.5] incompatible connection tags are reported', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      entity_definitions: [
        producerEntity('test.entity.p', ['test.recipe.a']),
        sourceEntity('test.entity.src', 'test.resource.a'),
      ],
      recipes: [recipe('test.recipe.a', ['test.resource.a'], ['test.resource.out'])],
      location_templates: [template('test.location.a'), template('test.location.b')],
      worlds: [
        world(
          'test.world',
          ['test.location.a', 'test.location.b'],
          [
            {
              id: 'test.connection.main',
              definition: 'test.connection.def',
              origin: 'test.loc.0',
              destination: 'test.loc.1',
            },
          ],
          [
            { definition: 'test.entity.p', location: 'test.loc.1' },
            { definition: 'test.entity.src', location: 'test.loc.0' },
          ],
        ),
      ],
      connections: [
        {
          id: 'test.connection.def',
          direction: 'bidirectional',
          traversal: { base_duration_ticks: 5 },
          allowed_transport_tags: ['test.tag.rail'],
        },
      ],
      transport_units: [
        {
          id: 'test.transport.a',
          entity_definition: 'test.entity.src',
          cargo: {
            compartment_policy: 'unrestricted',
            slots: 1,
            slot_capacity: 100,
            acceptance: 'all',
          },
          movement: { speed_permille: 500, allowed_connection_tags: ['test.tag.road'] },
          handling: { loading_rate_per_tick: 10, unloading_rate_per_tick: 10 },
        },
      ],
    });
    expect(codes(result)).toContain('transport_tag_mismatch');
  });

  it('[CONT-11.5] an establishment cost that cannot be shipped is reported', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.heavy', { transportable: false }),
      ],
      entity_definitions: [{ id: 'test.entity.hub', components: {} }],
      location_establishments: [
        {
          id: 'test.establishment.a',
          requires_knowledge: 'discovered',
          requires_unoccupied: true,
          cost_source: 'transport_cargo',
          costs: [{ resource: 'test.resource.heavy', quantity: 100 }],
          creates_hub: 'test.entity.hub',
          activation: 'on_completion',
          ownership: 'exclusive',
        },
      ],
    });
    const finding = result.diagnostics.find((d) => d.code === 'establishment_cost_invalid');
    expect(finding?.definition).toBe('test.establishment.a');
  });
});

describe('[CONT-11.5] exchange graph', () => {
  const exchange = (id: string, location: string) => ({
    id,
    location,
    currency: 'test.resource.credits',
    shared_between_owners: true,
    goods: [
      {
        resource: 'test.resource.a',
        buy_from_exchange: { base_price: 100, enabled: true },
        sell_to_exchange: { base_price: 50, enabled: true },
      },
    ],
    elasticity: {
      window_ticks: 10,
      step_quantity: 100,
      step_change_permille: 100,
      recovery_permille_per_interval: 100,
      recovery_interval_ticks: 5,
      min_price_permille: 500,
      max_price_permille: 2000,
    },
  });

  it('[CONT-11.5] an isolated exchange is reported', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.credits', { storage: { policy: 'normal', scope: 'owner' } }),
      ],
      location_templates: [template('test.location.a'), template('test.location.b')],
      worlds: [world('test.world', ['test.location.a', 'test.location.b'])],
      exchanges: [exchange('test.exchange.a', 'test.location.b')],
    });
    expect(codes(result)).toContain('exchange_unreachable');
  });

  it('[CONT-11.5] a connected exchange passes', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.credits', { storage: { policy: 'normal', scope: 'owner' } }),
      ],
      location_templates: [template('test.location.a'), template('test.location.b')],
      worlds: [
        world(
          'test.world',
          ['test.location.a', 'test.location.b'],
          [
            {
              id: 'test.connection.main',
              definition: 'test.connection.def',
              origin: 'test.loc.0',
              destination: 'test.loc.1',
            },
          ],
        ),
      ],
      connections: [
        {
          id: 'test.connection.def',
          direction: 'bidirectional',
          traversal: { base_duration_ticks: 5 },
        },
      ],
      exchanges: [exchange('test.exchange.a', 'test.location.b')],
    });
    expect(codes(result)).not.toContain('exchange_unreachable');
  });
});

describe('[CONT-11.5] unlock graph', () => {
  const unlock = (id: string, condition: string, targets: readonly object[]) => ({
    id,
    scope: 'global',
    targets,
    condition,
  });

  it('[CONT-11.5] a self-dependent unlock is reported', () => {
    const result = load({
      population_tiers: [{ id: 'test.tier.a', outputs: [] }],
      conditions: [
        {
          id: 'test.condition.count',
          expression: { gt: [{ population_count: { tier: 'test.tier.a' } }, 0] },
        },
      ],
      entity_definitions: [{ id: 'test.entity.a', components: {} }],
      unlocks: [
        unlock('test.unlock.a', 'test.condition.count', [
          { type: 'population_tier', id: 'test.tier.a' },
        ]),
      ],
    });
    expect(codes(result)).toContain('unlock_cycle');
  });

  it('[CONT-11.5] an acyclic unlock chain passes', () => {
    const result = load({
      population_tiers: [
        { id: 'test.tier.a', outputs: [] },
        { id: 'test.tier.b', outputs: [] },
      ],
      conditions: [
        {
          id: 'test.condition.a',
          expression: { gt: [{ population_count: { tier: 'test.tier.a' } }, 0] },
        },
        {
          id: 'test.condition.b',
          expression: { gt: [{ population_count: { tier: 'test.tier.b' } }, 0] },
        },
      ],
      entity_definitions: [{ id: 'test.entity.a', components: {} }],
      unlocks: [
        unlock('test.unlock.a', 'test.condition.a', [
          { type: 'population_tier', id: 'test.tier.b' },
        ]),
        unlock('test.unlock.b', 'test.condition.b', [
          { type: 'entity_definition', id: 'test.entity.other' },
        ]),
      ],
    });
    expect(codes(result)).not.toContain('unlock_cycle');
  });

  it('[CONT-11.5] a package with no initial entity is reported', () => {
    const result = load({
      population_tiers: [{ id: 'test.tier.a', outputs: [] }],
      conditions: [
        {
          id: 'test.condition.count',
          expression: { gt: [{ population_count: { tier: 'test.tier.a' } }, 0] },
        },
      ],
      entity_definitions: [
        { id: 'test.entity.a', components: {} },
        { id: 'test.entity.b', components: {} },
      ],
      unlocks: [
        unlock('test.unlock.a', 'test.condition.count', [
          { type: 'entity_definition', id: 'test.entity.a' },
          { type: 'entity_definition', id: 'test.entity.b' },
        ]),
      ],
    });
    expect(codes(result)).toContain('no_initial_content');
  });
});
