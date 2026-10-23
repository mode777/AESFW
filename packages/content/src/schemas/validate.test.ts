import { describe, expect, it } from 'vitest';

import type { ParsedFile } from '../package/parse.js';
import { COLLECTION_ORDER, DEFINITION_COLLECTIONS } from './collections.js';
import { isValidDefinitionId } from './ids.js';
import { validateSchemas } from './validate.js';

const resource = {
  id: 'test.resource.a',
  quantity: { precision: 'fixed', scale: 1000 },
  storage: { policy: 'normal', scope: 'inventory' },
  transportable: true,
};

const recipe = {
  id: 'test.recipe.a',
  mode: 'batch',
  duration_ticks: 10,
  inputs: [],
  outputs: [],
};

const file = (document: unknown): ParsedFile => ({
  package: 'test.game',
  path: 'content.yaml',
  document: document as ParsedFile['document'],
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[CONT-4] stable identifier rules', () => {
  it('[CONT-4] a qualified identifier is valid', () => {
    expect(isValidDefinitionId('example.population.tier_1')).toBe(true);
  });

  it('[CONT-4] an uppercase identifier is invalid', () => {
    expect(isValidDefinitionId('Example.Resource.A')).toBe(false);
  });

  it('[CONT-4] a single-segment identifier is invalid', () => {
    expect(isValidDefinitionId('resource')).toBe(false);
  });
});

describe('[CONT-11.2][TDS-20.2] raw-document schema validation', () => {
  it('[TDS-20.2] valid documents produce grouped raw definitions', () => {
    const result = validateSchemas([file({ resources: [resource], recipes: [recipe] })]);
    expect(result.diagnostics).toEqual([]);
    expect(result.definitions['resources']?.map((entry) => entry.id)).toEqual(['test.resource.a']);
    expect(result.definitions['recipes']?.map((entry) => entry.id)).toEqual(['test.recipe.a']);
  });

  it('[CONT-11.2] an unknown collection is rejected in strict mode', () => {
    const result = validateSchemas([file({ spells: [] })], { strictness: 'strict' });
    expect(codes(result.diagnostics)).toEqual(['unknown_definition_type']);
  });

  it('[CONT-11.2] an unknown collection is ignored in lenient mode', () => {
    const result = validateSchemas([file({ spells: [] })], { strictness: 'lenient' });
    expect(result.diagnostics).toEqual([]);
  });

  it('[TDS-20.2] a non-array collection is rejected', () => {
    const result = validateSchemas([file({ resources: { id: 'test.resource.a' } })]);
    expect(codes(result.diagnostics)).toEqual(['invalid_definition_document']);
  });

  it('[TDS-20.2] an invalid item does not throw', () => {
    expect(() => validateSchemas([file({ resources: [42] })])).not.toThrow();
    expect(codes(validateSchemas([file({ resources: [42] })]).diagnostics)).toContain(
      'schema_invalid',
    );
  });

  it('[CONT-4] an uppercase identifier reports invalid_id', () => {
    const result = validateSchemas([file({ resources: [{ ...resource, id: 'Test.Resource.A' }] })]);
    expect(codes(result.diagnostics)).toEqual(['invalid_id']);
    expect(result.diagnostics[0]?.path).toBe('/resources/0/id');
  });

  it('[CONT-6.8] a maintenance component validates', () => {
    const result = validateSchemas([
      file({
        entity_definitions: [
          {
            id: 'test.entity.maintained',
            components: {
              maintenance: {
                interval_ticks: 60,
                inputs: [{ resource: 'test.resource.credits', quantity: 30000 }],
                charge_policy: 'while_enabled',
                shortage_policy: 'owner_deficit_policy',
              },
            },
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.8] a maintenance component with an unknown field is rejected', () => {
    const result = validateSchemas([
      file({
        entity_definitions: [
          {
            id: 'test.entity.maintained',
            components: {
              maintenance: {
                interval_ticks: 60,
                inputs: [{ resource: 'test.resource.credits', quantity: 1 }],
                charge_policy: 'while_enabled',
                shortage_policy: 'ignore',
                debt: true,
              },
            },
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.8] a maintenance component with an empty inputs list is rejected', () => {
    const result = validateSchemas([
      file({
        entity_definitions: [
          {
            id: 'test.entity.maintained',
            components: {
              maintenance: {
                interval_ticks: 60,
                inputs: [],
                charge_policy: 'while_enabled',
                shortage_policy: 'ignore',
              },
            },
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.22] a deficit policy validates', () => {
    const result = validateSchemas([
      file({
        deficit_policies: [
          {
            id: 'test.deficit.default',
            resource: 'test.resource.credits',
            trigger: { operator: 'less', value: 0 },
            action: 'pause_entities',
            order: ['maintenance_desc', 'entity_id_asc'],
            stop_when: 'net_rate_non_negative',
            exclude_tags: ['test.tag.hub'],
            resume: {
              policy: 'automatic_reverse_order',
              when: { operator: 'greater_equal', value: 0 },
            },
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.22] an unknown action is rejected', () => {
    const result = validateSchemas([
      file({
        deficit_policies: [
          {
            id: 'test.deficit.default',
            resource: 'test.resource.credits',
            trigger: { operator: 'less', value: 0 },
            action: 'bankrupt',
            order: ['maintenance_desc'],
            stop_when: 'net_rate_non_negative',
            resume: { policy: 'manual', when: { operator: 'greater_equal', value: 0 } },
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.22] an empty order list is rejected', () => {
    const result = validateSchemas([
      file({
        deficit_policies: [
          {
            id: 'test.deficit.default',
            resource: 'test.resource.credits',
            trigger: { operator: 'less', value: 0 },
            action: 'pause_entities',
            order: [],
            stop_when: 'net_rate_non_negative',
            resume: { policy: 'manual', when: { operator: 'greater_equal', value: 0 } },
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.8] an entity definition with tags validates', () => {
    const result = validateSchemas([
      file({
        entity_definitions: [{ id: 'test.entity.hub', tags: ['test.tag.hub'], components: {} }],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });
});

describe('[TDS-7] definition collection catalogue', () => {
  it('[TDS-7] the catalogue covers the M1 collections in canonical order', () => {
    expect(COLLECTION_ORDER).toEqual([
      'resources',
      'location_templates',
      'recipes',
      'entity_definitions',
      'population_tiers',
      'needs',
      'need_categories',
      'services',
      'satisfaction_bands',
      'growth_policies',
      'conditions',
      'curves',
      'deficit_policies',
      'connections',
      'worlds',
      'transport_units',
      'transport_order_templates',
    ]);
    expect(DEFINITION_COLLECTIONS.resources).toBe('resource');
    expect(DEFINITION_COLLECTIONS.location_templates).toBe('location');
    expect(DEFINITION_COLLECTIONS.recipes).toBe('recipe');
    expect(DEFINITION_COLLECTIONS.entity_definitions).toBe('entity');
    expect(DEFINITION_COLLECTIONS.population_tiers).toBe('tier');
    expect(DEFINITION_COLLECTIONS.needs).toBe('need');
    expect(DEFINITION_COLLECTIONS.need_categories).toBe('needCategory');
    expect(DEFINITION_COLLECTIONS.growth_policies).toBe('growthPolicy');
    expect(DEFINITION_COLLECTIONS.deficit_policies).toBe('deficitPolicy');
    expect(DEFINITION_COLLECTIONS.connections).toBe('connection');
    expect(DEFINITION_COLLECTIONS.worlds).toBe('world');
    expect(DEFINITION_COLLECTIONS.transport_units).toBe('transportType');
    expect(DEFINITION_COLLECTIONS.transport_order_templates).toBe('transportOrder');
  });
});
