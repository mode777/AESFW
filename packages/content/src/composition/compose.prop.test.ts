import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { JsonValue } from '../types.js';
import type { RawDefinition } from '../schemas/validate.js';
import { composeDefinitions } from './compose.js';
import { merge } from './merge.js';

const CONTEXT = { package: null, file: null, path: '' } as const;

const leaf = fc.oneof(fc.integer(), fc.string(), fc.boolean());

const jsonValue = fc.letrec((tie) => ({
  value: fc.oneof(leaf, fc.array(tie('value')), fc.dictionary(fc.string(), tie('value'))),
})).value;

const plainRecord = fc.dictionary(
  fc.string({ minLength: 1 }).filter((key) => !['append', 'prepend', 'remove'].includes(key)),
  jsonValue,
);

const compose = (definitions: readonly RawDefinition[]) =>
  composeDefinitions({ entity_definitions: definitions }).definitions['entity_definitions'];

describe('[P-11] composition determinism', () => {
  it('[P-11] merge is associative for mappings', () => {
    fc.assert(
      fc.property(plainRecord, plainRecord, plainRecord, (a, b, c) => {
        const left = merge(
          merge(a as JsonValue, b as JsonValue, CONTEXT, []),
          c as JsonValue,
          CONTEXT,
          [],
        );
        const right = merge(
          a as JsonValue,
          merge(b as JsonValue, c as JsonValue, CONTEXT, []) as JsonValue,
          CONTEXT,
          [],
        );
        expect(left).toEqual(right);
      }),
    );
  });

  it('[P-11] resolved definitions are independent of input order', () => {
    fc.assert(
      fc.property(
        fc.array(fc.array(fc.nat({ max: 20 }), { maxLength: 3 }), { maxLength: 6 }),
        (raw) => {
          const definitions: RawDefinition[] = raw.map((includeIndices, index) => ({
            id: `test.entity.${String(index)}`,
            includes: includeIndices
              .filter((target) => target < index)
              .map((target) => `test.entity.${String(target)}`),
            payload: { index },
          }));
          const forward = compose(definitions);
          const backward = compose([...definitions].reverse());
          expect(forward).toEqual(backward);
        },
      ),
    );
  });
});
