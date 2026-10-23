/**
 * Unit tests for satisfaction-band schema validation and reference checks
 * (CONT-6.19, GDD-12.6).
 *
 * Source: CONT-6.19, GDD-12.6
 */
import { describe, expect, it } from 'vitest';

import type { ParsedFile } from '../package/parse.js';
import { buildRegistry } from './build.js';
import { validateSchemas } from '../schemas/validate.js';

const file = (document: unknown): ParsedFile => ({
  package: 'test.game',
  path: 'content.yaml',
  document: document as ParsedFile['document'],
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

const validBands = {
  id: 'test.bands.default',
  bands: [
    { min: 800, effects: [{ type: 'enable_advancement' }] },
    { min: 500, effects: [{ type: 'output_multiplier', resource: 'test.resource.a', value: 700 }] },
    { min: 0, effects: [{ type: 'enable_advancement' }] },
  ],
};

describe('[CONT-6.19] satisfaction-band tables', () => {
  it('[CONT-6.19] a descending band list is rejected as unsorted', () => {
    const result = buildRegistry({ satisfaction_bands: [validBands] });
    expect(codes(result.diagnostics)).toContain('invalid_satisfaction_bands');
  });

  it('[CONT-6.19] a table not starting at zero is rejected', () => {
    const result = buildRegistry({
      satisfaction_bands: [
        {
          id: 'test.bands.bad',
          bands: [{ min: 100, effects: [] }],
        },
      ],
    });
    expect(codes(result.diagnostics)).toContain('invalid_satisfaction_bands');
  });

  it('[CONT-6.19] a well-formed table validates', () => {
    const result = validateSchemas([
      file({
        satisfaction_bands: [
          {
            id: 'test.bands.good',
            bands: [
              { min: 0, effects: [] },
              { min: 500, effects: [{ type: 'enable_advancement' }] },
              { min: 800, effects: [] },
            ],
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.19] a tier band reference resolves', () => {
    const result = buildRegistry({
      resources: [
        {
          id: 'test.resource.a',
          quantity: { precision: 'fixed', scale: 1000 },
          storage: { policy: 'normal', scope: 'inventory' },
          transportable: true,
        },
      ],
      satisfaction_bands: [{ id: 'test.bands.default', bands: [{ min: 0, effects: [] }] }],
      population_tiers: [
        {
          id: 'test.tier.a',
          need_categories: [],
          satisfaction: { aggregation: 'average', bands: 'test.bands.default' },
          outputs: [],
        },
      ],
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.19] an unknown band reference is reported', () => {
    const result = buildRegistry({
      population_tiers: [
        {
          id: 'test.tier.a',
          need_categories: [],
          satisfaction: { bands: 'test.bands.absent' },
          outputs: [],
        },
      ],
    });
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
