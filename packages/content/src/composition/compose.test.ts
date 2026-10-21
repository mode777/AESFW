import { describe, expect, it } from 'vitest';

import type { RawDefinition } from '../schemas/validate.js';
import { composeDefinitions } from './compose.js';

const def = (value: Record<string, unknown>): RawDefinition => value as unknown as RawDefinition;

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

const composeEntities = (definitions: readonly RawDefinition[]) =>
  composeDefinitions({ entity_definitions: definitions });

const entities = (result: ReturnType<typeof composeDefinitions>) =>
  result.definitions['entity_definitions'] ?? [];

const entity = (result: ReturnType<typeof composeDefinitions>, id: string) =>
  entities(result).find((entry) => entry.id === id);

const producer = (definition: RawDefinition | undefined) =>
  (definition?.['components'] as { producer?: Record<string, unknown> } | undefined)?.producer;

describe('[CONT-5] include resolution', () => {
  it('[CONT-5] a definition inherits a base', () => {
    const result = composeEntities([
      def({ id: 'test.entity.a', components: { producer: { process_slots: 2 } } }),
      def({
        id: 'test.entity.b',
        includes: ['test.entity.a'],
        components: { producer: { recipes: ['test.recipe.a'] } },
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
    expect(producer(entity(result, 'test.entity.b'))).toEqual({
      process_slots: 2,
      recipes: ['test.recipe.a'],
    });
    expect(entity(result, 'test.entity.b')?.['includes']).toBeUndefined();
  });

  it('[CONT-5] own fields override included fields', () => {
    const result = composeEntities([
      def({ id: 'test.entity.a', components: { producer: { process_slots: 2 } } }),
      def({
        id: 'test.entity.b',
        includes: ['test.entity.a'],
        components: { producer: { process_slots: 3 } },
      }),
    ]);
    expect(producer(entity(result, 'test.entity.b'))).toEqual({ process_slots: 3 });
  });
});

describe('[CONT-5] merge rules', () => {
  it('[CONT-5] maps merge by key', () => {
    const result = composeEntities([
      def({ id: 'test.entity.a', components: { producer: { process_slots: 2 } } }),
      def({
        id: 'test.entity.b',
        includes: ['test.entity.a'],
        components: { producer: { recipes: ['test.recipe.a'] } },
      }),
    ]);
    expect(producer(entity(result, 'test.entity.b'))).toEqual({
      process_slots: 2,
      recipes: ['test.recipe.a'],
    });
  });

  it('[CONT-5] lists replace by default', () => {
    const result = composeEntities([
      def({ id: 'test.entity.a', components: { producer: { recipes: ['test.recipe.a'] } } }),
      def({
        id: 'test.entity.b',
        includes: ['test.entity.a'],
        components: { producer: { recipes: ['test.recipe.b'] } },
      }),
    ]);
    expect(producer(entity(result, 'test.entity.b'))?.['recipes']).toEqual(['test.recipe.b']);
  });
});

describe('[CONT-5] explicit list operations', () => {
  const withOp = (operation: Record<string, unknown>) =>
    composeEntities([
      def({ id: 'test.entity.a', components: { producer: { recipes: ['test.recipe.a'] } } }),
      def({
        id: 'test.entity.b',
        includes: ['test.entity.a'],
        components: { producer: { recipes: operation } },
      }),
    ]);

  it('[CONT-5] append adds to the end', () => {
    const result = withOp({ append: ['test.recipe.b'] });
    expect(producer(entity(result, 'test.entity.b'))?.['recipes']).toEqual([
      'test.recipe.a',
      'test.recipe.b',
    ]);
  });

  it('[CONT-5] prepend adds to the front', () => {
    const result = withOp({ prepend: ['test.recipe.b'] });
    expect(producer(entity(result, 'test.entity.b'))?.['recipes']).toEqual([
      'test.recipe.b',
      'test.recipe.a',
    ]);
  });

  it('[CONT-5] remove drops matching entries', () => {
    const result = withOp({ remove: ['test.recipe.a'] });
    expect(producer(entity(result, 'test.entity.b'))?.['recipes']).toEqual([]);
  });

  it('[CONT-5] an invalid directive is rejected', () => {
    const result = withOp({ append: ['test.recipe.b'], remove: ['test.recipe.a'] });
    expect(codes(result.diagnostics)).toEqual(['invalid_merge_directive']);
  });
});

describe('[CONT-5] include cycles and unresolved includes', () => {
  it('[CONT-5] a cycle is rejected', () => {
    const result = composeEntities([
      def({ id: 'test.entity.a', includes: ['test.entity.b'] }),
      def({ id: 'test.entity.b', includes: ['test.entity.a'] }),
    ]);
    expect(codes(result.diagnostics)).toContain('include_cycle');
  });

  it('[CONT-5] a missing include is reported', () => {
    const result = composeEntities([
      def({ id: 'test.entity.a', includes: ['test.entity.absent'] }),
    ]);
    expect(codes(result.diagnostics)).toEqual(['unresolved_include']);
    expect(result.diagnostics[0]?.definition).toBe('test.entity.absent');
    expect(entities(result)).toEqual([]);
  });
});

describe('[CONT-5] immutable resolved definitions', () => {
  it('[CONT-5] resolved definitions are frozen', () => {
    const result = composeEntities([def({ id: 'test.entity.a', components: {} })]);
    const resolved = entities(result)[0] as { id: string };
    expect(Object.isFrozen(resolved)).toBe(true);
    expect(() => {
      resolved.id = 'test.entity.changed';
    }).toThrow();
  });

  it('[CONT-5] the input is not mutated', () => {
    const input = [def({ id: 'test.entity.a', components: { producer: { process_slots: 2 } } })];
    const before = JSON.stringify(input);
    composeDefinitions({ entity_definitions: input });
    expect(JSON.stringify(input)).toBe(before);
  });

  it('[CONT-5] resolved definitions are ordered by ascending ID', () => {
    const result = composeEntities([def({ id: 'test.entity.b' }), def({ id: 'test.entity.a' })]);
    expect(entities(result).map((entry) => entry.id)).toEqual(['test.entity.a', 'test.entity.b']);
  });
});
