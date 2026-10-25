/**
 * Unit tests for the economic diagnostics (CONT-11.6): one test per spec
 * scenario, built through the real loader on in-memory sources.
 *
 * Source: CONT-11.6
 */
import { describe, expect, it } from 'vitest';

import { createMemorySource } from '../package/source.js';
import { loadContent } from '../registry/load.js';

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

const load = (document: unknown, options?: { economic_diagnostics: 'warning' | 'error' }) =>
  loadContent(
    [
      createMemorySource('test.game', {
        'package.yaml': manifestYaml(['content.yaml']),
        'content.yaml': JSON.stringify(document),
      }),
    ],
    { strictness: 'strict', ...options },
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

const sourceEntity = (id: string, resource: string, rate = 100) => ({
  id,
  components: {
    resource_source: {
      policy: 'infinite_rate',
      outputs: [{ resource, quantity_per_tick: rate }],
    },
  },
});

const template = (id: string, inventoryCapacity = 1000000) => ({
  id,
  spatial_policy: 'framework.spatial.abstract_capacity',
  spatial_parameters: { total_capacity: 100 },
  inventories: [
    {
      id: 'shared',
      capacity: { mode: 'total', quantity: inventoryCapacity },
      access_policy: 'framework.inventory.shared_location',
    },
  ],
  activation: { initial: true },
});

const deficitDocument = {
  resources: [
    resource('test.resource.a'),
    resource('test.cap.missing', {
      tags: ['virtual', 'capability'],
      quantity: { precision: 'integer', scale: 1 },
      storage: { policy: 'recomputed', scope: 'location' },
      transportable: false,
    }),
  ],
  recipes: [
    {
      id: 'test.recipe.needy',
      mode: 'batch',
      duration_ticks: 10,
      inputs: [{ resource: 'test.resource.a', quantity: 1000 }],
      outputs: [],
      capability_requirements: [{ resource: 'test.cap.missing', quantity: 1 }],
    },
  ],
  entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
};

const balanceDocument = (withIncome: boolean) => ({
  resources: [
    resource('test.resource.credits', {
      tags: ['balance'],
      storage: { policy: 'normal', scope: 'owner' },
      allow_negative: true,
      transportable: false,
    }),
  ],
  entity_definitions: [
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
    ...(withIncome ? [] : []),
  ],
  population_tiers: withIncome
    ? [
        {
          id: 'test.tier.a',
          need_categories: [],
          outputs: [
            {
              resource: 'test.resource.credits',
              scope: 'owner',
              rate_per_population_per_tick: 10,
            },
          ],
        },
      ]
    : [],
});

describe('[CONT-11.6] economic diagnostics stage', () => {
  it('[CONT-11.6] warnings are reported but the package loads', () => {
    const result = load(deficitDocument);
    const finding = result.diagnostics.find((d) => d.code === 'capability_deficit');
    expect(finding?.severity).toBe('warning');
    expect(result.content).not.toBeNull();
  });

  it('[CONT-11.6] promoted findings fail the load', () => {
    const result = load(deficitDocument, { economic_diagnostics: 'error' });
    const finding = result.diagnostics.find((d) => d.code === 'capability_deficit');
    expect(finding?.severity).toBe('error');
    expect(result.content).toBeNull();
  });

  it('[CONT-11.6] clean packages report nothing', () => {
    const result = load({
      resources: [resource('test.resource.a')],
      entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
      location_templates: [template('test.location.a')],
    });
    expect(
      codes(result).filter((code) =>
        [
          'capability_deficit',
          'negative_maintenance_balance',
          'inadequate_production',
          'throughput_below_equilibrium',
          'storage_below_batch',
          'transition_self_lock',
          'exchange_arbitrage_risk',
        ].includes(code),
      ),
    ).toEqual([]);
  });
});

describe('[CONT-11.6] guaranteed deficits', () => {
  it('[CONT-11.6] a capability with no provider is reported', () => {
    const result = load(deficitDocument);
    const finding = result.diagnostics.find((d) => d.code === 'capability_deficit');
    expect(finding?.definition).toBe('test.recipe.needy');
    expect(finding?.args).toMatchObject({ capability: 'test.cap.missing' });
  });

  it('[CONT-11.6] a chargeable balance with no income is reported', () => {
    const result = load(balanceDocument(false));
    const finding = result.diagnostics.find((d) => d.code === 'negative_maintenance_balance');
    expect(finding?.args).toMatchObject({ resource: 'test.resource.credits' });
  });

  it('[CONT-11.6] an income-bearing balance passes', () => {
    const result = load(balanceDocument(true));
    expect(codes(result)).not.toContain('negative_maintenance_balance');
  });
});

describe('[CONT-11.6] inadequate production and throughput', () => {
  it('[CONT-11.6] a need whose demand outruns production is reported', () => {
    const result = load({
      resources: [resource('test.resource.food')],
      entity_definitions: [sourceEntity('test.entity.farm', 'test.resource.food', 2)],
      needs: [
        {
          id: 'test.need.food',
          category: 'test.need_category.basic',
          applies_to: ['test.tier.a'],
          demand: {
            type: 'resource_consumption',
            resource: 'test.resource.food',
            quantity_per_population_per_tick: 5,
          },
          fulfillment: { measurement_window_ticks: 5, target_ratio: 1000 },
        },
      ],
      need_categories: [
        {
          id: 'test.need_category.basic',
          evaluation: { mode: 'all' },
          members: [{ need: 'test.need.food', weight: 1000 }],
        },
      ],
      population_tiers: [
        { id: 'test.tier.a', need_categories: ['test.need_category.basic'], outputs: [] },
      ],
    });
    const finding = result.diagnostics.find((d) => d.code === 'inadequate_production');
    expect(finding?.definition).toBe('test.need.food');
    expect(finding?.args).toMatchObject({ demand: 5, supply: 2 });
  });

  it('[CONT-11.6] a balanced need passes', () => {
    const result = load({
      resources: [resource('test.resource.food')],
      entity_definitions: [sourceEntity('test.entity.farm', 'test.resource.food', 10)],
      needs: [
        {
          id: 'test.need.food',
          category: 'test.need_category.basic',
          applies_to: ['test.tier.a'],
          demand: {
            type: 'resource_consumption',
            resource: 'test.resource.food',
            quantity_per_population_per_tick: 5,
          },
          fulfillment: { measurement_window_ticks: 5, target_ratio: 1000 },
        },
      ],
      need_categories: [
        {
          id: 'test.need_category.basic',
          evaluation: { mode: 'all' },
          members: [{ need: 'test.need.food', weight: 1000 }],
        },
      ],
      population_tiers: [
        { id: 'test.tier.a', need_categories: ['test.need_category.basic'], outputs: [] },
      ],
    });
    expect(codes(result)).not.toContain('inadequate_production');
  });

  it('[CONT-11.6] import demand above carrier capacity is reported', () => {
    const result = load({
      resources: [resource('test.resource.a'), resource('test.resource.out')],
      recipes: [
        {
          id: 'test.recipe.refine',
          mode: 'batch',
          duration_ticks: 10,
          inputs: [{ resource: 'test.resource.a', quantity: 1000 }],
          outputs: [{ resource: 'test.resource.out', quantity: 1000 }],
        },
      ],
      entity_definitions: [
        sourceEntity('test.entity.src', 'test.resource.a'),
        {
          id: 'test.entity.refiner',
          components: {
            producer: {
              recipes: ['test.recipe.refine'],
              process_slots: 1,
              input_inventory: 'location.shared',
              output_inventory: 'location.shared',
            },
          },
        },
      ],
      location_templates: [template('test.location.a'), template('test.location.b')],
      connections: [
        {
          id: 'test.connection.long',
          direction: 'bidirectional',
          traversal: { base_duration_ticks: 100 },
        },
      ],
      worlds: [
        {
          id: 'test.world',
          locations: [
            { id: 'test.loc.0', template: 'test.location.a' },
            { id: 'test.loc.1', template: 'test.location.b' },
          ],
          connections: [
            {
              id: 'test.conn.0',
              definition: 'test.connection.long',
              origin: 'test.loc.0',
              destination: 'test.loc.1',
            },
          ],
          owners: [
            {
              id: 'test.owner',
              initial_entities: [
                { definition: 'test.entity.src', location: 'test.loc.0' },
                { definition: 'test.entity.refiner', location: 'test.loc.1' },
              ],
            },
          ],
        },
      ],
      transport_units: [
        {
          id: 'test.transport.small',
          entity_definition: 'test.entity.src',
          cargo: {
            compartment_policy: 'unrestricted',
            slots: 1,
            slot_capacity: 100,
            acceptance: 'all',
          },
          movement: { speed_permille: 1000 },
          handling: { loading_rate_per_tick: 10, unloading_rate_per_tick: 10 },
        },
      ],
    });
    const finding = result.diagnostics.find((d) => d.code === 'throughput_below_equilibrium');
    expect(finding?.definition).toBe('test.world');
    expect(finding?.args).toMatchObject({ resource: 'test.resource.a', location: 'test.loc.1' });
  });
});

describe('[CONT-11.6] storage, transition, and arbitrage', () => {
  it('[CONT-11.6] an inventory too small for a batch is reported', () => {
    const result = load({
      resources: [resource('test.resource.a'), resource('test.resource.out')],
      recipes: [
        {
          id: 'test.recipe.big',
          mode: 'batch',
          duration_ticks: 10,
          inputs: [{ resource: 'test.resource.a', quantity: 5000 }],
          outputs: [{ resource: 'test.resource.out', quantity: 1000 }],
        },
      ],
      entity_definitions: [
        sourceEntity('test.entity.src', 'test.resource.a'),
        {
          id: 'test.entity.producer',
          components: {
            producer: {
              recipes: ['test.recipe.big'],
              process_slots: 1,
              input_inventory: 'location.shared',
              output_inventory: 'location.shared',
            },
          },
        },
      ],
      location_templates: [template('test.location.a', 1000)],
    });
    const finding = result.diagnostics.find((d) => d.code === 'storage_below_batch');
    expect(finding?.definition).toBe('test.entity.producer');
  });

  it('[CONT-11.6] a transition locked by its own target is reported', () => {
    const result = load({
      resources: [resource('test.resource.luxury')],
      population_tiers: [
        { id: 'test.tier.1', need_categories: [], outputs: [] },
        {
          id: 'test.tier.2',
          need_categories: [],
          outputs: [
            {
              resource: 'test.resource.luxury',
              scope: 'location',
              rate_per_population_per_tick: 1,
            },
          ],
        },
      ],
      transitions: [
        {
          id: 'test.transition.locked',
          source_tier: 'test.tier.1',
          target_tier: 'test.tier.2',
          duration_ticks: 5,
          conversion: { population: 'retain_count' },
          costs: [{ resource: 'test.resource.luxury', quantity: 100 }],
        },
      ],
    });
    const finding = result.diagnostics.find((d) => d.code === 'transition_self_lock');
    expect(finding?.definition).toBe('test.transition.locked');
  });

  it('[CONT-11.6] a recipe-mediated arbitrage loop is reported', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.b'),
        resource('test.resource.credits', {
          tags: ['balance'],
          storage: { policy: 'normal', scope: 'owner' },
          transportable: false,
          allow_negative: true,
        }),
      ],
      recipes: [
        {
          id: 'test.recipe.arb',
          mode: 'batch',
          duration_ticks: 10,
          inputs: [{ resource: 'test.resource.a', quantity: 1000 }],
          outputs: [{ resource: 'test.resource.b', quantity: 1000 }],
        },
      ],
      exchanges: [
        {
          id: 'test.exchange.a',
          location: 'test.location.a',
          currency: 'test.resource.credits',
          shared_between_owners: true,
          goods: [
            {
              resource: 'test.resource.a',
              buy_from_exchange: { base_price: 100, enabled: true },
              sell_to_exchange: { base_price: 50, enabled: true },
            },
            {
              resource: 'test.resource.b',
              buy_from_exchange: { base_price: 2000, enabled: true },
              sell_to_exchange: { base_price: 1000, enabled: true },
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
        },
      ],
      location_templates: [template('test.location.a')],
    });
    const finding = result.diagnostics.find((d) => d.code === 'exchange_arbitrage_risk');
    expect(finding?.definition).toBe('test.recipe.arb');
  });

  it('[CONT-11.6] a balanced production chain reports nothing', () => {
    const result = load({
      resources: [
        resource('test.resource.a'),
        resource('test.resource.out'),
        resource('test.resource.credits', {
          tags: ['balance'],
          storage: { policy: 'normal', scope: 'owner' },
          transportable: false,
          allow_negative: true,
        }),
      ],
      recipes: [
        {
          id: 'test.recipe.chain',
          mode: 'batch',
          duration_ticks: 10,
          inputs: [{ resource: 'test.resource.a', quantity: 1000 }],
          outputs: [{ resource: 'test.resource.out', quantity: 1000 }],
        },
      ],
      entity_definitions: [
        sourceEntity('test.entity.src', 'test.resource.a', 50),
        {
          id: 'test.entity.producer',
          components: {
            producer: {
              recipes: ['test.recipe.chain'],
              process_slots: 1,
              input_inventory: 'location.shared',
              output_inventory: 'location.shared',
            },
          },
        },
      ],
      population_tiers: [
        {
          id: 'test.tier.a',
          need_categories: [],
          outputs: [
            {
              resource: 'test.resource.credits',
              scope: 'owner',
              rate_per_population_per_tick: 10,
            },
          ],
        },
      ],
      location_templates: [template('test.location.a')],
    });
    expect(
      codes(result).filter((code) =>
        [
          'capability_deficit',
          'negative_maintenance_balance',
          'inadequate_production',
          'throughput_below_equilibrium',
          'storage_below_batch',
          'transition_self_lock',
          'exchange_arbitrage_risk',
        ].includes(code),
      ),
    ).toEqual([]);
  });
});
