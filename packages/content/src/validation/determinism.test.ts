/**
 * Unit tests for determinism validation (CONT-11.8): one test per spec
 * scenario, built through the real loader on in-memory sources.
 *
 * Source: CONT-11.8
 */
import { describe, expect, it } from 'vitest';

import { createMemorySource } from '../package/source.js';
import { loadContent } from '../registry/load.js';

const manifestYaml = (id: string, type: string, files: readonly string[]): string =>
  [
    'package:',
    `  id: ${id}`,
    '  version: 1.0.0',
    '  schema_version: 1',
    `  type: ${type}`,
    '  files:',
    ...files.map((file) => `    - ${file}`),
  ].join('\n') + '\n';

const load = (
  files: Record<string, string>,
  manifests: readonly { id: string; type: string }[] = [
    { id: 'test.game', type: 'simulation_content' },
  ],
) =>
  loadContent(
    manifests.map((manifest) =>
      createMemorySource(manifest.id, {
        'package.yaml': manifestYaml(manifest.id, manifest.type, ['content.yaml']),
        ...files,
      }),
    ),
    { strictness: 'strict' },
  );

const codes = (result: { readonly diagnostics: readonly { readonly code: string }[] }) =>
  result.diagnostics.map((diagnostic) => diagnostic.code);

const CLEAN_CONDITION = {
  conditions: [
    {
      id: 'test.condition.a',
      expression: { gt: [{ population_count: { tier: 'test.tier.a' } }, 0] },
    },
  ],
  population_tiers: [{ id: 'test.tier.a', need_categories: [], outputs: [] }],
};

describe('[CONT-11.8] determinism validation', () => {
  it('[CONT-11.8] a wall-clock expression is rejected', () => {
    const result = load({
      'content.yaml': JSON.stringify({
        ...CLEAN_CONDITION,
        conditions: [
          ...CLEAN_CONDITION.conditions,
          { id: 'test.condition.clock', expression: { now: {} } },
        ],
      }),
    });
    expect(codes(result)).toContain('wall_clock_expression');
    expect(result.diagnostics.find((d) => d.code === 'wall_clock_expression')?.package).toBe(
      'test.game',
    );
  });

  it('[CONT-11.8] an unseeded random operator is rejected', () => {
    const result = load({
      'content.yaml': JSON.stringify({
        ...CLEAN_CONDITION,
        conditions: [
          ...CLEAN_CONDITION.conditions,
          { id: 'test.condition.dice', expression: { random: {} } },
        ],
      }),
    });
    expect(codes(result)).toContain('unseeded_random');
  });

  it('[CONT-11.8] a platform-dependent number is rejected', () => {
    const result = load({
      'content.yaml': JSON.stringify({
        resources: [
          {
            id: 'test.resource.a',
            tags: ['storable'],
            quantity: { precision: 'fixed', scale: 0.1 },
            storage: { policy: 'normal', scope: 'inventory' },
            transportable: true,
          },
        ],
      }),
    });
    const finding = result.diagnostics.find((d) => d.code === 'platform_numeric');
    expect(finding?.path).toContain('scale');
    expect(result.content).toBeNull();
  });

  it('[CONT-11.8] an embedded script is rejected', () => {
    const result = load({
      'content.yaml': JSON.stringify({
        ...CLEAN_CONDITION,
        conditions: [
          ...CLEAN_CONDITION.conditions,
          { id: 'test.condition.script', expression: { eval: 'x => x' } },
        ],
      }),
    });
    expect(codes(result)).toContain('executable_script');
  });

  it('[CONT-11.8] a module redefining core content is rejected', () => {
    const result = load(
      {
        'content.yaml': JSON.stringify({
          resources: [
            {
              id: 'framework.resource.core',
              tags: ['storable'],
              quantity: { precision: 'fixed', scale: 1000 },
              storage: { policy: 'normal', scope: 'inventory' },
              transportable: true,
            },
          ],
        }),
      },
      [{ id: 'test.module.extra', type: 'optional_module' }],
    );
    expect(codes(result)).toContain('module_redefines_core');
  });

  it('[CONT-11.8] deterministic content passes', () => {
    const result = load({ 'content.yaml': JSON.stringify(CLEAN_CONDITION) });
    expect(
      codes(result).filter((code) =>
        [
          'wall_clock_expression',
          'unseeded_random',
          'platform_numeric',
          'executable_script',
          'module_redefines_core',
        ].includes(code),
      ),
    ).toEqual([]);
  });
});
