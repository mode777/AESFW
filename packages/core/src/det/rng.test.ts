import { describe, expect, it } from 'vitest';
import { createStream, nextInt, xoshiro128ssNext } from './rng.js';
import type { RngStream, Seed } from './rng.js';

const seed: Seed = [1, 2];

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

describe('[TDS-15] seeded random streams', () => {
  it('[TDS-15] the same seed and name reproduce the same sequence', () => {
    expect(drawValues(createStream(seed, 'demo'), 8)).toEqual(
      drawValues(createStream(seed, 'demo'), 8),
    );
  });

  it('[TDS-15] distinct stream names produce distinct sequences', () => {
    expect(drawValues(createStream(seed, 'demo.a'), 8)).not.toEqual(
      drawValues(createStream(seed, 'demo.b'), 8),
    );
  });

  it('[TDS-15] drawing from one stream does not affect another', () => {
    const baseline = drawValues(createStream(seed, 'demo.b'), 5);

    let a = createStream(seed, 'demo.a');
    let b = createStream(seed, 'demo.b');
    const interleaved: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      const aDraw = xoshiro128ssNext(a);
      a = aDraw.stream;
      const bDraw = xoshiro128ssNext(b);
      b = bDraw.stream;
      interleaved.push(bDraw.value);
    }

    expect(interleaved).toEqual(baseline);
  });

  it('[TDS-15] nextInt stays within the requested bound', () => {
    let stream = createStream(seed, 'demo');
    for (let index = 0; index < 200; index += 1) {
      const draw = nextInt(stream, 6);
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(6);
      stream = draw.stream;
    }
    expect(nextInt(stream, 1).value).toBe(0);
  });

  it('[TDS-15] xoshiro values are unsigned 32-bit', () => {
    let stream = createStream(seed, 'demo');
    for (let index = 0; index < 100; index += 1) {
      const draw = xoshiro128ssNext(stream);
      expect(Number.isInteger(draw.value)).toBe(true);
      expect(draw.value).toBeGreaterThanOrEqual(0);
      expect(draw.value).toBeLessThan(2 ** 32);
      stream = draw.stream;
    }
  });
});
