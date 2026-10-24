/**
 * Unit tests for distribution-rule validation (CONT-6.18): structure, region
 * references, and disjointness of the authored attribute supply.
 *
 * Source: GDD-3.3, GDD-6.4, CONT-6.18
 */
import { describe, expect, it } from 'vitest';

import { loadContent } from '../registry/load.js';
import { createMemorySource } from '../package/source.js';

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

const template = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  spatial_policy: 'framework.spatial.abstract_capacity',
  spatial_parameters: { total_capacity: 100 },
  inventories: [
    {
      id: 'shared',
      capacity: { mode: 'total', quantity: 1000 },
      access_policy: 'framework.inventory.shared_location',
    },
  ],
  activation: { initial: true },
  ...overrides,
});

const rule = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.distribution.disjoint',
  regions: ['test.region.alpha', 'test.region.beta'],
  disjoint: { properties: ['test.property.suitability_*'], source_slot_types: true },
  generation: { mode: 'fixed' },
  ...overrides,
});

describe('[CONT-6.18][GDD-6.4] distribution-rule validation', () => {
  it('[CONT-6.18] a well-formed rule with disjoint authored attributes loads', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }, { id: 'test.region.beta' }],
      location_templates: [
        template('test.location.a', {
          region: 'test.region.alpha',
          properties: { 'test.property.suitability_c': 1000 },
        }),
        template('test.location.b', {
          region: 'test.region.beta',
          properties: { 'test.property.suitability.d': 1000 },
        }),
      ],
      distribution_rules: [rule()],
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.18] a single-region rule reports invalid_distribution_rule', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }],
      distribution_rules: [rule({ regions: ['test.region.alpha'] })],
    });
    expect(codes(result)).toContain('invalid_distribution_rule');
  });

  it('[CONT-6.18] duplicate rule regions report invalid_distribution_rule', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }],
      distribution_rules: [rule({ regions: ['test.region.alpha', 'test.region.alpha'] })],
    });
    expect(codes(result)).toContain('invalid_distribution_rule');
  });

  it('[CONT-6.18] an empty disjoint specification reports invalid_distribution_rule', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }, { id: 'test.region.beta' }],
      distribution_rules: [rule({ disjoint: { properties: [], source_slot_types: false } })],
    });
    expect(codes(result)).toContain('invalid_distribution_rule');
  });

  it('[CONT-6.18] an unknown rule region reports unresolved_reference', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }],
      distribution_rules: [rule({ regions: ['test.region.alpha', 'test.region.missing'] })],
    });
    expect(codes(result)).toContain('unresolved_reference');
  });

  it('[GDD-3.3] two regions supplying the same matched property violate the rule', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }, { id: 'test.region.beta' }],
      location_templates: [
        template('test.location.a', {
          region: 'test.region.alpha',
          properties: { 'test.property.suitability_c': 1000 },
        }),
        template('test.location.b', {
          region: 'test.region.beta',
          properties: { 'test.property.suitability_c': 500 },
        }),
      ],
      distribution_rules: [rule()],
    });
    expect(codes(result)).toContain('distribution_not_disjoint');
  });

  it('[GDD-6.4] a zero value supplies nothing', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }, { id: 'test.region.beta' }],
      location_templates: [
        template('test.location.a', {
          region: 'test.region.alpha',
          properties: { 'test.property.suitability_c': 0 },
        }),
        template('test.location.b', {
          region: 'test.region.beta',
          properties: { 'test.property.suitability_c': 500 },
        }),
      ],
      distribution_rules: [rule()],
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('[GDD-3.3] two regions supplying the same slot type violate the rule', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }, { id: 'test.region.beta' }],
      location_templates: [
        template('test.location.a', {
          region: 'test.region.alpha',
          source_slots: [{ type: 'test.slot.deposit', count: 2 }],
        }),
        template('test.location.b', {
          region: 'test.region.beta',
          source_slots: [{ type: 'test.slot.deposit', count: 1 }],
        }),
      ],
      distribution_rules: [rule({ disjoint: { properties: [], source_slot_types: true } })],
    });
    expect(codes(result)).toContain('distribution_not_disjoint');
  });

  it('[GDD-6.4] a world-location override participates in the supply check', () => {
    const result = load({
      regions: [{ id: 'test.region.alpha' }, { id: 'test.region.beta' }],
      location_templates: [
        template('test.location.a', { region: 'test.region.alpha' }),
        template('test.location.b', { region: 'test.region.beta' }),
      ],
      worlds: [
        {
          id: 'test.world.one',
          locations: [
            { id: 'test.loc.a', template: 'test.location.a' },
            {
              id: 'test.loc.b',
              template: 'test.location.b',
              region: 'test.region.alpha',
              properties: { 'test.property.suitability_c': 1000 },
            },
            {
              id: 'test.loc.c',
              template: 'test.location.b',
              properties: { 'test.property.suitability_c': 700 },
            },
          ],
        },
      ],
      distribution_rules: [rule()],
    });
    expect(codes(result)).toContain('distribution_not_disjoint');
  });
});

describe('[CONT-6.20] establishment references', () => {
  const resources = [
    {
      id: 'test.resource.package',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    },
  ];

  it('[CONT-6.20] establishment references resolve', () => {
    const result = load({
      resources,
      entity_definitions: [{ id: 'test.entity.hub', components: {} }],
      location_establishments: [
        {
          id: 'test.establishment.default',
          requires_knowledge: 'discovered',
          requires_unoccupied: true,
          cost_source: 'transport_cargo',
          costs: [{ resource: 'test.resource.package', quantity: 1000 }],
          creates_hub: 'test.entity.hub',
          activation: 'on_completion',
          ownership: 'exclusive',
        },
      ],
      location_templates: [
        template('test.location.a', { establishment: 'test.establishment.default' }),
      ],
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.20] a hub that is not an entity definition is reported', () => {
    const result = load({
      resources,
      location_establishments: [
        {
          id: 'test.establishment.default',
          requires_knowledge: 'discovered',
          requires_unoccupied: true,
          cost_source: 'transport_cargo',
          costs: [{ resource: 'test.resource.package', quantity: 1000 }],
          creates_hub: 'test.resource.package',
          activation: 'on_completion',
          ownership: 'exclusive',
        },
      ],
    });
    expect(codes(result)).toContain('reference_type_mismatch');
  });

  it('[CONT-6.20] a template establishment that does not resolve is reported', () => {
    const result = load({
      location_templates: [
        template('test.location.a', { establishment: 'test.establishment.missing' }),
      ],
    });
    expect(codes(result)).toContain('unresolved_reference');
  });
});
