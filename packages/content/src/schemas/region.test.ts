/**
 * Unit tests for the region and distribution-rule schemas and the
 * location-template `region` field (CONT-6.18).
 *
 * Source: CONT-6.18, CONT-6.4
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

describe('[CONT-6.18] region and distribution-rule schemas', () => {
  it('[CONT-6.18] a region definition validates', () => {
    const result = validateSchemas([
      file({ regions: [{ id: 'test.region.alpha', tags: ['test.region.group'] }] }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.18] a well-formed distribution rule validates', () => {
    const result = validateSchemas([
      file({
        distribution_rules: [
          {
            id: 'test.distribution.disjoint',
            regions: ['test.region.alpha', 'test.region.beta'],
            disjoint: { properties: ['test.property.suitability_*'], source_slot_types: true },
            generation: { mode: 'fixed' },
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.18] an unknown generation mode is rejected', () => {
    const result = validateSchemas([
      file({
        distribution_rules: [
          {
            id: 'test.distribution.disjoint',
            regions: ['test.region.alpha', 'test.region.beta'],
            disjoint: { properties: [], source_slot_types: false },
            generation: { mode: 'random' },
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.18] a distribution rule with unknown fields is rejected', () => {
    const result = validateSchemas([
      file({
        distribution_rules: [
          {
            id: 'test.distribution.disjoint',
            regions: ['test.region.alpha', 'test.region.beta'],
            disjoint: { properties: [], source_slot_types: false },
            generation: { mode: 'fixed' },
            extra: true,
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.18] a location template with a region validates', () => {
    const result = validateSchemas([
      file({
        regions: [{ id: 'test.region.alpha' }],
        location_templates: [
          {
            id: 'test.location.a',
            spatial_policy: 'framework.spatial.abstract_capacity',
            spatial_parameters: { total_capacity: 100 },
            region: 'test.region.alpha',
            inventories: [
              {
                id: 'shared',
                capacity: { mode: 'total', quantity: 1000 },
                access_policy: 'framework.inventory.shared_location',
              },
            ],
            activation: { initial: true },
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });
});
