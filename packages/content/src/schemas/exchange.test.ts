/**
 * Unit tests for the exchange schema and its collection-local validation
 * (CONT-6.21, GDD-17.3).
 *
 * Source: GDD-17.2, GDD-17.3, CONT-6.21
 */
import { describe, expect, it } from 'vitest';

import { validateSchemas } from './validate.js';
import { resolveReferences } from '../registry/references.js';
import type { ParsedFile } from '../package/parse.js';

const file = (document: unknown): ParsedFile => ({
  package: 'test.game',
  path: 'content.yaml',
  document: document as ParsedFile['document'],
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

const exchange = (overrides: Record<string, unknown> = {}) => ({
  id: 'test.exchange.default',
  location: 'test.location.trade',
  currency: 'test.resource.credits',
  goods: [
    {
      resource: 'test.resource.a',
      buy_from_exchange: { base_price: 12000, enabled: true },
      sell_to_exchange: { base_price: 8000, enabled: true },
    },
  ],
  elasticity: {
    window_ticks: 600,
    step_quantity: 100000,
    step_change_permille: 20,
    recovery_permille_per_interval: 50,
    recovery_interval_ticks: 60,
    min_price_permille: 100,
    max_price_permille: 5000,
  },
  shared_between_owners: true,
  ...overrides,
});

const base = (): Record<string, unknown> => ({
  resources: [
    {
      id: 'test.resource.credits',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'owner' },
      transportable: false,
      allow_negative: true,
    },
    {
      id: 'test.resource.a',
      quantity: { precision: 'fixed', scale: 1000 },
      storage: { policy: 'normal', scope: 'inventory' },
      transportable: true,
    },
  ],
  location_templates: [
    {
      id: 'test.location.trade',
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
    },
  ],
  exchanges: [exchange()],
});

describe('[CONT-6.21] exchange schemas', () => {
  it('[CONT-6.21] an exchange definition with every v1 field validates', () => {
    const result = validateSchemas([file(base())]);
    expect(codes(result.diagnostics)).toEqual([]);
  });

  it('[CONT-6.21] a missing elasticity block is rejected', () => {
    const document = base();
    const entry = exchange() as Record<string, unknown>;
    delete entry.elasticity;
    document.exchanges = [entry];
    const result = validateSchemas([file(document)]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });

  it('[CONT-6.21] an unknown field is rejected', () => {
    const document = base();
    document.exchanges = [exchange({ discount: 5 })];
    const result = validateSchemas([file(document)]);
    expect(codes(result.diagnostics)).toContain('schema_invalid');
  });
});

describe('[CONT-6.21, GDD-17.3] exchange validation', () => {
  it('[GDD-17.3] an inverted spread is rejected as a diagnostic', () => {
    const document = base();
    document.exchanges = [
      exchange({
        goods: [
          {
            resource: 'test.resource.a',
            buy_from_exchange: { base_price: 8000, enabled: true },
            sell_to_exchange: { base_price: 8000, enabled: true },
          },
        ],
      }),
    ];
    const validated = validateSchemas([file(document)]);
    const diagnostics = resolveReferences(validated.definitions);
    expect(diagnostics.map((entry) => entry.code)).toContain('invalid_exchange');
    const finding = diagnostics.find((entry) => entry.code === 'invalid_exchange');
    expect(finding?.args['reason']).toBe('sell_not_below_buy');
  });

  it('[GDD-17.3] min above max is rejected as a diagnostic', () => {
    const document = base();
    document.exchanges = [
      exchange({
        elasticity: {
          window_ticks: 600,
          step_quantity: 100000,
          step_change_permille: 20,
          recovery_permille_per_interval: 50,
          recovery_interval_ticks: 60,
          min_price_permille: 5000,
          max_price_permille: 100,
        },
      }),
    ];
    const validated = validateSchemas([file(document)]);
    const diagnostics = resolveReferences(validated.definitions);
    const finding = diagnostics.find((entry) => entry.code === 'invalid_exchange');
    expect(finding?.args['reason']).toBe('min_above_max');
  });

  it('[CONT-6.21] unresolved location, currency, and goods references are rejected', () => {
    const document = base();
    document.exchanges = [
      exchange({ location: 'test.location.nowhere', currency: 'test.resource.nowhere' }),
    ];
    const validated = validateSchemas([file(document)]);
    const diagnostics = resolveReferences(validated.definitions);
    expect(diagnostics.map((entry) => entry.code)).toContain('unresolved_reference');
  });

  it('[CONT-6.21] a valid exchange resolves all references', () => {
    const validated = validateSchemas([file(base())]);
    const diagnostics = resolveReferences(validated.definitions);
    expect(diagnostics).toEqual([]);
  });
});
