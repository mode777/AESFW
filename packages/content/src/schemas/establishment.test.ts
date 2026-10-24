/**
 * Unit tests for the location-establishment schema and the template
 * `establishment` field (CONT-6.20, CONT-6.4).
 *
 * Source: GDD-16.3, CONT-6.20
 */
import { describe, expect, it } from 'vitest';

import { validateSchemas } from './validate.js';
import type { ParsedFile } from '../package/parse.js';

const file = (document: unknown): ParsedFile => ({
  package: 'test.game',
  path: 'content.yaml',
  document: document as ParsedFile['document'],
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

const template = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.location.a',
  spatial_policy: 'framework.spatial.abstract_capacity',
  spatial_parameters: { total_capacity: 100 },
  inventories: [
    {
      id: 'shared',
      capacity: { mode: 'total', quantity: 1000 },
      access_policy: 'framework.inventory.shared_location',
    },
  ],
  activation: { initial: false },
  ...overrides,
});

const establishment = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.establishment.default',
  requires_knowledge: 'discovered',
  requires_unoccupied: true,
  cost_source: 'transport_cargo',
  costs: [{ resource: 'test.resource.package', quantity: 1000 }],
  creates_hub: 'test.entity.hub',
  activation: 'on_completion',
  ownership: 'exclusive',
  ...overrides,
});

describe('[CONT-6.20] establishment schemas', () => {
  it('[CONT-6.20] an establishment definition with every v1 field validates', () => {
    const result = validateSchemas([
      file({
        resources: [
          {
            id: 'test.resource.package',
            quantity: { precision: 'fixed', scale: 1000 },
            storage: { policy: 'normal', scope: 'inventory' },
            transportable: true,
          },
        ],
        entity_definitions: [{ id: 'test.entity.hub', components: {} }],
        location_establishments: [establishment()],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.20] an unknown cost source is rejected', () => {
    const result = validateSchemas([
      file({ location_establishments: [establishment({ cost_source: 'remote_inventory' })] }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.20] an unknown activation is rejected', () => {
    const result = validateSchemas([
      file({ location_establishments: [establishment({ activation: 'delayed' })] }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.20] a template with an establishment validates', () => {
    const result = validateSchemas([
      file({
        location_establishments: [establishment()],
        location_templates: [template({ establishment: 'test.establishment.default' })],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });
});
