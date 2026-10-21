import { describe, expect, it } from 'vitest';

import type { JsonValue } from '@aesfw/content';
import {
  content,
  definitionById,
  definitionsOf,
  diagnosticCodes,
  expectContentOk,
  expectNoDiagnostics,
} from './content-builder.js';

const j = (value: unknown): JsonValue => value as JsonValue;

const resource = {
  id: 'test.resource.a',
  tags: ['storable'],
  quantity: { precision: 'fixed', scale: 1000 },
  storage: { policy: 'normal', scope: 'inventory' },
  transportable: true,
};

const recipe = {
  id: 'test.recipe.a',
  mode: 'batch',
  duration_ticks: 10,
  inputs: [{ resource: 'test.resource.a', quantity: 1000 }],
  outputs: [],
};

const goodBuild = () =>
  content().define('resources', j(resource)).define('recipes', j(recipe)).build();

describe('[VER-5.2] content builder', () => {
  it('[VER-5.2] the builder compiles definitions through the pipeline', () => {
    const result = goodBuild();
    expect(result.diagnostics).toEqual([]);
    expect(result.content).not.toBeNull();
    expect(result.checksum).not.toBeNull();
    expect(result.registry).not.toBeNull();
  });

  it('[VER-5.2] the builder surfaces pipeline diagnostics', () => {
    const broken = content()
      .define(
        'recipes',
        j({ ...recipe, inputs: [{ resource: 'test.resource.absent', quantity: 1 }] }),
      )
      .build();
    expect(broken.content).toBeNull();
    expect(diagnosticCodes(broken)).toContain('unresolved_reference');
  });
});

describe('[VER-5.2] content query helpers', () => {
  it('[VER-5.2] a definition is found by id', () => {
    const result = goodBuild();
    expect(result.registry).not.toBeNull();
    const found = definitionById(result.registry!, 'resource', 'test.resource.a');
    expect(found?.id).toBe('test.resource.a');
    expect(definitionsOf(result.registry!, 'resource')).toHaveLength(1);
  });

  it('[VER-5.2] an absent definition returns null', () => {
    const result = goodBuild();
    expect(result.registry).not.toBeNull();
    expect(definitionById(result.registry!, 'resource', 'test.resource.absent')).toBeNull();
  });
});

describe('[VER-5.2] content assertion helpers', () => {
  it('[VER-5.2] a successful build passes the assertion', () => {
    const result = goodBuild();
    expect(expectContentOk(result)).toBe(result.content);
    expect(() => expectNoDiagnostics(result)).not.toThrow();
  });

  it('[VER-5.2] a failed build throws', () => {
    const broken = content()
      .define(
        'recipes',
        j({ ...recipe, inputs: [{ resource: 'test.resource.absent', quantity: 1 }] }),
      )
      .build();
    expect(() => expectContentOk(broken)).toThrow();
  });

  it('[VER-5.2] diagnostics are summarised as codes', () => {
    const broken = content()
      .define(
        'recipes',
        j({ ...recipe, inputs: [{ resource: 'test.resource.absent', quantity: 1 }] }),
      )
      .build();
    expect(diagnosticCodes(broken)).toContain('unresolved_reference');
  });
});
