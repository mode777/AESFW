/**
 * Unit tests for the unlock schema and its reference checks (CONT-6.17).
 *
 * Source: CONT-6.17, GDD-19
 */
import { describe, expect, it } from 'vitest';

import { buildRegistry } from './build.js';
import { validateSchemas } from '../schemas/validate.js';
import type { ParsedFile } from '../package/parse.js';

const file = (document: unknown): ParsedFile => ({
  package: 'test.game',
  path: 'content.yaml',
  document: document as ParsedFile['document'],
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[CONT-6.17] unlock definitions', () => {
  it('[CONT-6.17] a well-formed unlock validates', () => {
    const result = validateSchemas([
      file({
        unlocks: [
          {
            id: 'test.unlock.a',
            scope: 'owner',
            targets: [{ type: 'recipe', id: 'test.recipe.a' }],
            condition: 'test.condition.a',
          },
        ],
      }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-6.17] an unknown target type is reported', () => {
    const result = validateSchemas([
      file({
        unlocks: [
          {
            id: 'test.unlock.a',
            scope: 'owner',
            targets: [{ type: 'spaceship', id: 'test.recipe.a' }],
            condition: 'test.condition.a',
          },
        ],
      }),
    ]);
    expect(codes(result.diagnostics).length).toBeGreaterThan(0);
  });

  it('[CONT-6.17] an unresolved condition fails the registry build', () => {
    const result = buildRegistry({
      unlocks: [
        {
          id: 'test.unlock.a',
          scope: 'owner',
          targets: [{ type: 'recipe', id: 'test.recipe.a' }],
          condition: 'test.condition.absent',
        },
      ],
      recipes: [
        { id: 'test.recipe.a', mode: 'batch', duration_ticks: 1, inputs: [], outputs: [] },
      ],
    });
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });

  it('[CONT-6.17] an unknown target type is reported by the registry build', () => {
    const result = buildRegistry({
      unlocks: [
        {
          id: 'test.unlock.a',
          scope: 'owner',
          targets: [{ type: 'spaceship', id: 'test.recipe.a' }],
          condition: 'test.condition.a',
        },
      ],
      conditions: [{ id: 'test.condition.a', expression: true }],
    });
    expect(codes(result.diagnostics)).toContain('invalid_unlock_target');
  });
});
