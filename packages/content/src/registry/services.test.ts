/**
 * Unit tests for services, the service-provider component, and the extended
 * need demand union (CONT-6.8, CONT-6.11, CONT-6.12).
 *
 * Source: CONT-6.8, CONT-6.11, CONT-6.12, GDD-9.6
 */
import { describe, expect, it } from 'vitest';

import { createMemorySource } from '../package/source.js';
import { loadContent } from '../registry/load.js';
import type { ParsedFile } from '../package/parse.js';
import { validateSchemas } from '../schemas/validate.js';

const file = (document: unknown): ParsedFile => ({
  package: 'test.game',
  path: 'content.yaml',
  document: document as ParsedFile['document'],
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[CONT-6.12][GDD-9.6] service definitions', () => {
  it('[CONT-6.12] a coverage service with a default relation compiles', () => {
    const result = validateSchemas([
      file({
        services: [
          {
            id: 'test.service.market',
            mode: 'coverage',
            default_relation: { type: 'radius', cells: 6 },
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(result.definitions['services']?.[0]?.['mode']).toBe('coverage');
  });

  it('[CONT-6.12] a non-positive radius is rejected', () => {
    const result = validateSchemas([
      file({
        services: [
          {
            id: 'test.service.market',
            mode: 'coverage',
            default_relation: { type: 'radius', cells: 0 },
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics).length).toBeGreaterThan(0);
  });

  it('[CONT-6.8][GDD-9.6] a capacity provider requires capability and quantity', () => {
    const valid = validateSchemas([
      file({
        entity_definitions: [
          {
            id: 'test.entity.provider',
            components: {
              service_provider: {
                mode: 'capacity',
                service: 'test.service.capacity',
                capability: 'test.resource.a',
                quantity_per_tick: 5,
              },
            },
          },
        ],
      }),
    ]);
    expect(valid.diagnostics).toEqual([]);
    const missing = validateSchemas([
      file({
        entity_definitions: [
          {
            id: 'test.entity.provider',
            components: {
              service_provider: { mode: 'capacity', service: 'test.service.capacity' },
            },
          },
        ],
      }),
    ]);
    expect(codes(missing.diagnostics).length).toBeGreaterThan(0);
  });
});

describe('[CONT-6.11] service, coverage, and state-query demands', () => {
  const base = {
    id: 'test.need.x',
    category: 'test.need_category.a',
    applies_to: ['test.tier.a'],
    fulfillment: { measurement_window_ticks: 10, target_ratio: 1000 },
  };

  it('[CONT-6.11] the three new demand shapes validate', () => {
    const result = validateSchemas([
      file({
        needs: [
          {
            ...base,
            id: 'test.need.capacity',
            demand: {
              type: 'service_capacity',
              service: 'test.service.a',
              quantity_per_population_per_tick: 2,
            },
          },
          {
            ...base,
            id: 'test.need.coverage',
            demand: { type: 'spatial_coverage', service: 'test.service.a' },
          },
          {
            ...base,
            id: 'test.need.state',
            demand: { type: 'state_query', condition: 'test.condition.a' },
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.11][CONT-11.3] an unknown service reference fails the load', () => {
    const source = createMemorySource('test.game', {
      'package.yaml': [
        'package:',
        '  id: test.game',
        '  version: 1.0.0',
        '  schema_version: 1',
        '  type: simulation_content',
        '  files:',
        '    - content.yaml',
        '',
      ].join('\n'),
      'content.yaml': [
        'needs:',
        '  - id: test.need.coverage',
        '    category: test.need_category.a',
        '    applies_to: [test.tier.a]',
        '    demand:',
        '      type: spatial_coverage',
        '      service: test.service.absent',
        '    fulfillment: { measurement_window_ticks: 10, target_ratio: 1000 }',
        '',
      ].join('\n'),
    });
    const result = loadContent([source], { strictness: 'strict' });
    expect(result.content).toBeNull();
    expect(result.diagnostics.some((entry) => entry.severity === 'error')).toBe(true);
  });
});
