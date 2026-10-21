import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canonicalStringify } from './canonical.js';
import { createStream, xoshiro128ssNext } from './rng.js';
import type { RngStream, Seed } from './rng.js';

const PR_BUDGET = { numRuns: 100 } as const;

const keyArb = fc.stringMatching(/^[a-z][a-z0-9]{0,3}$/);

const jsonSafe: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: 'small' },
    fc.integer({ min: -1000000, max: 1000000 }),
    fc.boolean(),
    fc.string(),
    fc.constant(null),
    fc.array(tie('value'), { maxLength: 4 }),
    fc.dictionary(keyArb, tie('value'), { maxKeys: 4 }),
  ),
})).value;

const reorder = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(reorder);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const reordered: Record<string, unknown> = {};
    for (const key of Object.keys(record).reverse()) {
      reordered[key] = reorder(record[key]);
    }
    return reordered;
  }
  return value;
};

const drawValues = (stream: RngStream, count: number): number[] => {
  const values: number[] = [];
  let current = stream;
  for (let index = 0; index < count; index += 1) {
    const draw = xoshiro128ssNext(current);
    values.push(draw.value);
    current = draw.stream;
  }
  return values;
};

describe('[VER-7.1] determinism properties', () => {
  it('[VER-7.1] P-04 canonical encoding is key-order invariant and round-trips', () => {
    fc.assert(
      fc.property(jsonSafe, (value) => {
        const canonical = canonicalStringify(value);
        expect(canonicalStringify(reorder(value))).toBe(canonical);
        expect(JSON.parse(canonical)).toEqual(value);
      }),
      PR_BUDGET,
    );
  });

  it('[VER-7.1] P-05 streams are reproducible and independent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.integer({ min: 0, max: 0xffffffff }),
        fc.stringMatching(/^[a-z.]{1,8}$/),
        fc.integer({ min: 1, max: 10 }),
        (s0, s1, name, count) => {
          const seed: Seed = [s0, s1];
          const sequence = drawValues(createStream(seed, name), count);
          expect(drawValues(createStream(seed, name), count)).toEqual(sequence);

          let stream = createStream(seed, name);
          let other = createStream(seed, `${name}.x`);
          const interleaved: number[] = [];
          for (let index = 0; index < count; index += 1) {
            const draw = xoshiro128ssNext(stream);
            interleaved.push(draw.value);
            stream = draw.stream;
            const otherDraw = xoshiro128ssNext(other);
            other = otherDraw.stream;
          }
          expect(interleaved).toEqual(sequence);
        },
      ),
      PR_BUDGET,
    );
  });
});
