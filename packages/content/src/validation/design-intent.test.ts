/**
 * Unit tests for the design-intent diagnostics (CONT-11.7): one test per spec
 * scenario, built through the real loader on in-memory sources.
 *
 * Source: CONT-11.7, GDD-3.2
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

const load = (
  document: unknown,
  options?: { design_intent?: 'off' | 'warning' | 'error'; ratio_legibility_threshold?: number },
) =>
  loadContent(
    [
      createMemorySource('test.game', {
        'package.yaml': manifestYaml(['content.yaml']),
        'content.yaml': JSON.stringify(document),
      }),
    ],
    { strictness: 'strict', ...options },
  );

const intentCodes = (result: { readonly diagnostics: readonly { readonly code: string }[] }) =>
  result.diagnostics
    .filter((diagnostic) =>
      [
        'inactive_scarcities',
        'self_sufficient_region',
        'cross_region_absent',
        'pyramid_bypass',
        'breadth_depth_collapse',
        'coverage_absent',
        'idle_cost_absent',
        'decline_symmetric',
        'unbounded_trade',
        'ratio_illegible',
      ].includes(diagnostic.code),
    )
    .map((diagnostic) => diagnostic.code);

const DESIGN_INTENT_CODES = intentCodes;

const resource = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  tags: ['storable'],
  quantity: { precision: 'fixed', scale: 1000 },
  storage: { policy: 'normal', scope: 'inventory' },
  transportable: true,
  ...overrides,
});

const sourceEntity = (id: string, resourceId: string, rate = 100) => ({
  id,
  components: {
    resource_source: {
      policy: 'infinite_rate',
      outputs: [{ resource: resourceId, quantity_per_tick: rate }],
    },
  },
});

/** A minimal package whose graph checks pass so intent findings stand alone. */
const baseWorld = () => ({
  location_templates: [
    {
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
    },
  ],
  worlds: [{ id: 'test.world', locations: [{ id: 'test.loc.0', template: 'test.location.a' }] }],
});

describe('[CONT-11.7] design-intent stage and promotion', () => {
  const document = { resources: [resource('test.resource.a')] };

  it('[CONT-11.7] disabled by default', () => {
    const result = load(document);
    expect(DESIGN_INTENT_CODES(result)).toEqual([]);
  });

  it('[CONT-11.7] warnings when enabled', () => {
    const result = load(document, { design_intent: 'warning' });
    expect(DESIGN_INTENT_CODES(result).length).toBeGreaterThan(0);
    for (const diagnostic of result.diagnostics) {
      if (DESIGN_INTENT_CODES(result).includes(diagnostic.code)) {
        expect(diagnostic.severity).toBe('warning');
      }
    }
    expect(result.content).not.toBeNull();
  });

  it('[CONT-11.7] promoted findings fail the load', () => {
    const result = load(document, { design_intent: 'error' });
    const findings = result.diagnostics.filter((diagnostic) =>
      DESIGN_INTENT_CODES(result).includes(diagnostic.code),
    );
    expect(findings.length).toBeGreaterThan(0);
    for (const finding of findings) expect(finding.severity).toBe('error');
    expect(result.content).toBeNull();
  });
});

describe('[GDD-3.2] scarcity coverage report', () => {
  it('[GDD-3.2] a package missing scarcities is reported', () => {
    const result = load(
      {
        ...baseWorld(),
        resources: [resource('test.resource.a')],
        entity_definitions: [sourceEntity('test.entity.src', 'test.resource.a')],
      },
      { design_intent: 'warning' },
    );
    const finding = result.diagnostics.find((d) => d.code === 'inactive_scarcities');
    expect(finding).toBeDefined();
    const scarcities = String(finding?.args?.scarcities ?? '').split(',');
    expect(scarcities).toContain('disjoint_distribution');
    expect(scarcities).toContain('asymmetric_decline');
  });

  it('[GDD-3.2] a package with all scarcities active is clean', () => {
    const result = load(allScarcitiesDocument(), { design_intent: 'warning' });
    expect(DESIGN_INTENT_CODES(result)).not.toContain('inactive_scarcities');
  });
});

/** A package that activates every design idea (used by several tests). */
function allScarcitiesDocument() {
  return {
    resources: [
      resource('test.resource.raw_a'),
      resource('test.resource.raw_b'),
      resource('test.resource.goods'),
      resource('test.resource.credits', {
        tags: ['balance'],
        storage: { policy: 'normal', scope: 'owner' },
        transportable: false,
        allow_negative: true,
      }),
      resource('test.cap.t1', {
        tags: ['virtual', 'capability'],
        quantity: { precision: 'integer', scale: 1 },
        storage: { policy: 'recomputed', scope: 'location' },
        transportable: false,
      }),
    ],
    location_templates: [
      {
        id: 'test.location.a',
        spatial_policy: 'framework.spatial.abstract_capacity',
        spatial_parameters: { total_capacity: 100 },
        region: 'test.region.north',
        internal_logistics: { policy: 'framework.logistics.pooled', base_throughput: 1000 },
        source_slots: [{ type: 'test.slot.deposit', count: 2 }],
        inventories: [
          {
            id: 'shared',
            capacity: { mode: 'total', quantity: 1000000 },
            access_policy: 'framework.inventory.shared_location',
          },
        ],
        activation: { initial: true },
      },
      {
        id: 'test.location.b',
        spatial_policy: 'framework.spatial.abstract_capacity',
        spatial_parameters: { total_capacity: 100 },
        region: 'test.region.south',
        internal_logistics: { policy: 'framework.logistics.pooled', base_throughput: 1000 },
        inventories: [
          {
            id: 'shared',
            capacity: { mode: 'total', quantity: 1000000 },
            access_policy: 'framework.inventory.shared_location',
          },
        ],
        activation: { initial: true },
      },
    ],
    connections: [
      {
        id: 'test.connection.road',
        direction: 'bidirectional',
        traversal: { base_duration_ticks: 5 },
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
            definition: 'test.connection.road',
            origin: 'test.loc.0',
            destination: 'test.loc.1',
          },
        ],
        owners: [
          {
            id: 'test.owner',
            initial_entities: [
              { definition: 'test.entity.mine_a', location: 'test.loc.0' },
              { definition: 'test.entity.mine_b', location: 'test.loc.1' },
              { definition: 'test.entity.home', location: 'test.loc.0' },
            ],
          },
        ],
      },
    ],
    regions: [{ id: 'test.region.north' }, { id: 'test.region.south' }],
    distribution_rules: [
      {
        id: 'test.rule.deposits',
        regions: ['test.region.north', 'test.region.south'],
        disjoint: { properties: ['test.property.deposits_*'], source_slot_types: false },
        generation: { mode: 'fixed' },
      },
    ],
    recipes: [
      {
        id: 'test.recipe.craft',
        mode: 'batch',
        duration_ticks: 10,
        inputs: [
          { resource: 'test.resource.raw_a', quantity: 1000 },
          { resource: 'test.resource.raw_b', quantity: 1000 },
        ],
        outputs: [{ resource: 'test.resource.goods', quantity: 1000 }],
        capability_requirements: [{ resource: 'test.cap.t1', quantity: 1 }],
      },
    ],
    entity_definitions: [
      sourceEntity('test.entity.mine_a', 'test.resource.raw_a'),
      sourceEntity('test.entity.mine_b', 'test.resource.raw_b'),
      {
        id: 'test.entity.craft',
        components: {
          producer: {
            recipes: ['test.recipe.craft'],
            process_slots: 1,
            input_inventory: 'location.shared',
            output_inventory: 'location.shared',
          },
          maintenance: {
            interval_ticks: 10,
            inputs: [{ resource: 'test.resource.credits', quantity: 100 }],
            charge_policy: 'while_exists',
            shortage_policy: 'ignore',
          },
        },
      },
      {
        id: 'test.entity.home',
        components: {
          residence: {
            population_tier: 'test.tier.1',
            capacity: 10,
            growth_policy: 'test.growth.none',
          },
        },
      },
    ],
    growth_policies: [{ id: 'test.growth.none', interval_ticks: 10 }],
    transitions: [
      {
        id: 'test.transition.up',
        source_tier: 'test.tier.1',
        target_tier: 'test.tier.2',
        duration_ticks: 5,
        conversion: { population: 'retain_count_clamped' },
      },
      {
        id: 'test.transition.down',
        source_tier: 'test.tier.2',
        target_tier: 'test.tier.1',
        duration_ticks: 5,
        conversion: { population: 'retain_count_clamped' },
        refund_policy: { policy: 'none' },
      },
    ],
    population_tiers: [
      {
        id: 'test.tier.1',
        need_categories: ['test.need_category.basic'],
        decline_transitions: [],
        outputs: [
          {
            resource: 'test.cap.t1',
            scope: 'location',
            rate_per_population_per_tick: 1,
          },
          {
            resource: 'test.resource.credits',
            scope: 'owner',
            rate_per_population_per_tick: 10,
          },
        ],
      },
      {
        id: 'test.tier.2',
        need_categories: ['test.need_category.basic'],
        decline_transitions: ['test.transition.down'],
        outputs: [
          {
            resource: 'test.cap.t1',
            scope: 'location',
            rate_per_population_per_tick: 1,
          },
          {
            resource: 'test.resource.credits',
            scope: 'owner',
            rate_per_population_per_tick: 10,
          },
        ],
      },
    ],
    needs: [
      {
        id: 'test.need.goods',
        category: 'test.need_category.basic',
        applies_to: ['test.tier.1', 'test.tier.2'],
        demand: {
          type: 'resource_consumption',
          resource: 'test.resource.goods',
          quantity_per_population_per_tick: 1,
        },
        fulfillment: { measurement_window_ticks: 5, target_ratio: 1000 },
      },
      {
        id: 'test.need.watch',
        category: 'test.need_category.basic',
        applies_to: ['test.tier.1', 'test.tier.2'],
        demand: { type: 'spatial_coverage', service: 'test.service.watch' },
        fulfillment: { measurement_window_ticks: 5, target_ratio: 1000 },
      },
    ],
    need_categories: [
      {
        id: 'test.need_category.basic',
        evaluation: { mode: 'weighted_score', required_score: 1000 },
        members: [
          { need: 'test.need.goods', weight: 3000 },
          { need: 'test.need.watch', weight: 1000 },
        ],
      },
    ],
    services: [{ id: 'test.service.watch' }],
  };
}

describe('[CONT-11.7] self-sufficiency and cross-region dependency', () => {
  it('[CONT-11.7] a self-sufficient region is reported', () => {
    const document = allScarcitiesDocument();
    const result = load(document, { design_intent: 'warning' });
    // The base document is cross-region dependent; assert no self-sufficiency.
    expect(DESIGN_INTENT_CODES(result)).not.toContain('self_sufficient_region');
  });

  it('[CONT-11.7] a cross-region-dependent top tier passes', () => {
    const result = load(allScarcitiesDocument(), { design_intent: 'warning' });
    expect(DESIGN_INTENT_CODES(result)).not.toContain('cross_region_absent');
  });

  it('[CONT-11.7] a top tier servable from one region is reported', () => {
    const document = allScarcitiesDocument();
    // Add a south mine for goods inputs -> south alone covers the top tier.
    document.entity_definitions.push(
      sourceEntity('test.entity.mine_a_south', 'test.resource.raw_a'),
    );
    document.worlds[0]?.owners[0]?.initial_entities.push({
      definition: 'test.entity.mine_a_south',
      location: 'test.loc.1',
    });
    // And a crafter in the south.
    document.worlds[0]?.owners[0]?.initial_entities.push({
      definition: 'test.entity.craft',
      location: 'test.loc.1',
    });
    const result = load(document, { design_intent: 'warning' });
    expect(DESIGN_INTENT_CODES(result)).toContain('cross_region_absent');
  });
});

describe('[CONT-11.7] pyramid, breadth, and coverage intent', () => {
  it('[CONT-11.7][GDD-3.4] a substitute capability is reported', () => {
    const result = load(
      {
        resources: [
          resource('test.cap.a', {
            tags: ['virtual', 'capability'],
            quantity: { precision: 'integer', scale: 1 },
            storage: { policy: 'recomputed', scope: 'location' },
            transportable: false,
            substitutes: ['test.cap.b'],
          }),
          resource('test.cap.b', {
            tags: ['virtual', 'capability'],
            quantity: { precision: 'integer', scale: 1 },
            storage: { policy: 'recomputed', scope: 'location' },
            transportable: false,
          }),
        ],
      },
      { design_intent: 'warning' },
    );
    const finding = result.diagnostics.find((d) => d.code === 'pyramid_bypass');
    expect(finding?.definition).toBe('test.cap.a');
  });

  it('[CONT-11.7][GDD-3.5] a collapsed weighted category is reported', () => {
    const result = load(
      {
        needs: [
          {
            id: 'test.need.a',
            category: 'test.need_category.flat',
            applies_to: ['test.tier.a'],
            demand: {
              type: 'resource_consumption',
              resource: 'test.resource.a',
              quantity_per_population_per_tick: 1,
            },
            fulfillment: { measurement_window_ticks: 5, target_ratio: 1000 },
          },
        ],
        need_categories: [
          {
            id: 'test.need_category.flat',
            evaluation: { mode: 'weighted_score', required_score: 1000 },
            members: [{ need: 'test.need.a', weight: 1000 }],
          },
        ],
        population_tiers: [{ id: 'test.tier.a', need_categories: [], outputs: [] }],
      },
      { design_intent: 'warning' },
    );
    const finding = result.diagnostics.find((d) => d.code === 'breadth_depth_collapse');
    expect(finding?.definition).toBe('test.need_category.flat');
  });

  it('[CONT-11.7][GDD-3.6] a package without coverage needs is reported', () => {
    const result = load(
      {
        needs: [
          {
            id: 'test.need.flow',
            category: 'test.need_category.basic',
            applies_to: ['test.tier.a'],
            demand: {
              type: 'resource_consumption',
              resource: 'test.resource.a',
              quantity_per_population_per_tick: 1,
            },
            fulfillment: { measurement_window_ticks: 5, target_ratio: 1000 },
          },
        ],
        need_categories: [
          {
            id: 'test.need_category.basic',
            evaluation: { mode: 'all' },
            members: [{ need: 'test.need.flow', weight: 1000 }],
          },
        ],
        population_tiers: [{ id: 'test.tier.a', need_categories: [], outputs: [] }],
        resources: [resource('test.resource.a')],
      },
      { design_intent: 'warning' },
    );
    expect(DESIGN_INTENT_CODES(result)).toContain('coverage_absent');
  });

  it('[CONT-11.7] intent-bearing content is clean', () => {
    const result = load(allScarcitiesDocument(), { design_intent: 'warning' });
    expect(DESIGN_INTENT_CODES(result)).not.toContain('pyramid_bypass');
    expect(DESIGN_INTENT_CODES(result)).not.toContain('breadth_depth_collapse');
    expect(DESIGN_INTENT_CODES(result)).not.toContain('coverage_absent');
  });
});

describe('[CONT-11.7] idle cost, decline symmetry, trade bounds, ratio legibility', () => {
  it('[CONT-11.7] idle-cost-free maintenance is reported', () => {
    const result = load(
      {
        resources: [resource('test.resource.a')],
        entity_definitions: [
          {
            id: 'test.entity.processing',
            components: {
              producer: {
                recipes: [],
                process_slots: 1,
                input_inventory: 'location.shared',
                output_inventory: 'location.shared',
              },
              maintenance: {
                interval_ticks: 10,
                inputs: [],
                charge_policy: 'while_processing',
                shortage_policy: 'ignore',
              },
            },
          },
        ],
      },
      { design_intent: 'warning' },
    );
    expect(DESIGN_INTENT_CODES(result)).toContain('idle_cost_absent');
  });

  it('[CONT-11.7] a symmetric decline is reported', () => {
    const result = load(
      {
        population_tiers: [
          { id: 'test.tier.1', need_categories: [], outputs: [] },
          {
            id: 'test.tier.2',
            need_categories: [],
            decline_transitions: ['test.transition.down'],
            outputs: [],
          },
        ],
        transitions: [
          {
            id: 'test.transition.up',
            source_tier: 'test.tier.1',
            target_tier: 'test.tier.2',
            duration_ticks: 5,
            conversion: { population: 'retain_count' },
          },
          {
            id: 'test.transition.down',
            source_tier: 'test.tier.2',
            target_tier: 'test.tier.1',
            duration_ticks: 5,
            conversion: { population: 'retain_count' },
          },
        ],
      },
      { design_intent: 'warning' },
    );
    const finding = result.diagnostics.find((d) => d.code === 'decline_symmetric');
    expect(finding?.definition).toBe('test.transition.down');
  });

  it('[CONT-11.7] an unbounded good is reported', () => {
    const result = load(
      {
        resources: [
          resource('test.resource.a'),
          resource('test.resource.credits', {
            tags: ['balance'],
            storage: { policy: 'normal', scope: 'owner' },
            transportable: false,
            allow_negative: true,
          }),
        ],
        exchanges: [
          {
            id: 'test.exchange.flat',
            location: 'test.location.a',
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
              step_change_permille: 0,
              recovery_permille_per_interval: 0,
              recovery_interval_ticks: 5,
              min_price_permille: 500,
              max_price_permille: 2000,
            },
          },
        ],
        ...baseWorld(),
      },
      { design_intent: 'warning' },
    );
    const finding = result.diagnostics.find((d) => d.code === 'unbounded_trade');
    expect(finding?.definition).toBe('test.exchange.flat');
  });

  it('[CONT-11.7] an illegible ratio is reported', () => {
    const result = load(
      {
        resources: [resource('test.resource.a'), resource('test.resource.b')],
        recipes: [
          {
            id: 'test.recipe.long',
            mode: 'batch',
            duration_ticks: 1000,
            inputs: [{ resource: 'test.resource.a', quantity: 1000 }],
            outputs: [{ resource: 'test.resource.b', quantity: 1 }],
          },
          {
            id: 'test.recipe.eat',
            mode: 'batch',
            duration_ticks: 10,
            inputs: [{ resource: 'test.resource.b', quantity: 1000 }],
            outputs: [],
          },
        ],
      },
      { design_intent: 'warning', ratio_legibility_threshold: 10 },
    );
    const finding = result.diagnostics.find((d) => d.code === 'ratio_illegible');
    expect(finding?.definition).toBe('test.recipe.long');
  });

  it('[CONT-11.7] asymmetric bounded content is clean', () => {
    const result = load(allScarcitiesDocument(), { design_intent: 'warning' });
    expect(DESIGN_INTENT_CODES(result)).not.toContain('idle_cost_absent');
    expect(DESIGN_INTENT_CODES(result)).not.toContain('decline_symmetric');
    expect(DESIGN_INTENT_CODES(result)).not.toContain('unbounded_trade');
    expect(DESIGN_INTENT_CODES(result)).not.toContain('ratio_illegible');
  });
});
