/**
 * Seeded random streams (TDS-15). The generator is `xoshiro128**` (algorithm
 * tag `rng-xoshiro128ss-v1`). Streams are immutable values: every draw returns
 * a new stream, so streams are reproducible and independent. Only optional
 * modules and seeded world generation may draw random numbers.
 *
 * Source: TDS-15
 */
import { InvariantViolation } from '../errors/invariant-violation.js';
import { fnv1a32 } from './hash.js';

/** An unsigned 32-bit integer in `[0, 2^32)`. */
export type Uint32 = number;

/** A session seed: two `uint32` words (TDS-10.1). */
export type Seed = readonly [Uint32, Uint32];

/** A xoshiro128\*\* state: four `uint32` words. */
export interface RngStream {
  readonly s: readonly [Uint32, Uint32, Uint32, Uint32];
}

/** A drawn `uint32` and the stream state after the draw. */
export interface RngDraw {
  readonly value: Uint32;
  readonly stream: RngStream;
}

/** A drawn value in `[0, boundExclusive)` and the stream state after the draw. */
export interface IntDraw {
  readonly value: Uint32;
  readonly stream: RngStream;
}

const SPLITMIX_GOLDEN = 0x9e3779b9;

/** Fallback state used in the (vanishing) case that derivation yields all-zero words. */
const NONZERO_FALLBACK: RngStream = {
  s: [0x9e3779b9, 0x243f6a88, 0xb7e15162, 0x85ebca6b],
};

const toUint32 = (value: number): Uint32 => value >>> 0;

const rotl = (value: Uint32, shift: number): Uint32 =>
  ((value << shift) | (value >>> (32 - shift))) >>> 0;

/**
 * One `splitmix32` step: returns a mixed `uint32` value and the advanced
 * `uint32` state.
 *
 * Source: TDS-15
 */
export function splitmix32(state: Uint32): { readonly value: Uint32; readonly state: Uint32 } {
  const next = toUint32((state + SPLITMIX_GOLDEN) | 0);
  let mixed = next ^ (next >>> 16);
  mixed = Math.imul(mixed, 0x21f0aaad);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x735a2d97);
  mixed ^= mixed >>> 15;
  return { value: toUint32(mixed), state: next };
}

/**
 * Derives a stream state from a two-word seed and a stream name (TDS-15, v1
 * derivation of design D4): the seed words are folded with the `fnv1a32` of
 * the name, and four consecutive `splitmix32` outputs become the state words.
 *
 * Source: TDS-15
 */
export function createStream(seed: Seed, name: string): RngStream {
  let state = toUint32(seed[0] ^ seed[1] ^ fnv1a32(name));
  const words: Uint32[] = [];
  for (let index = 0; index < 4; index += 1) {
    const step = splitmix32(state);
    words.push(step.value);
    state = step.state;
  }
  if (words.every((word) => word === 0)) {
    return NONZERO_FALLBACK;
  }
  return { s: [words[0] ?? 0, words[1] ?? 0, words[2] ?? 0, words[3] ?? 0] };
}

/**
 * Advances a `xoshiro128**` stream by one step, returning the `uint32` value
 * and the next state.
 *
 * Source: TDS-15
 */
export function xoshiro128ssNext(stream: RngStream): RngDraw {
  const [s0, s1, s2, s3] = stream.s;
  const result = toUint32(Math.imul(rotl(toUint32(Math.imul(s1, 5)), 7), 9));
  const t = toUint32(s1 << 9);

  let n0 = s0;
  let n1 = s1;
  let n2 = s2;
  let n3 = s3;
  n2 = toUint32(n2 ^ n0);
  n3 = toUint32(n3 ^ n1);
  n1 = toUint32(n1 ^ n2);
  n0 = toUint32(n0 ^ n3);
  n2 = toUint32(n2 ^ t);
  n3 = rotl(n3, 11);

  return { value: result, stream: { s: [n0, n1, n2, n3] } };
}

/**
 * Draws an integer in `[0, boundExclusive)` using rejection sampling so no
 * modulo bias is introduced (TDS-15). A bound of `1` returns `0` without
 * drawing.
 *
 * Source: TDS-15
 */
export function nextInt(stream: RngStream, boundExclusive: Uint32): IntDraw {
  if (!Number.isSafeInteger(boundExclusive) || boundExclusive <= 0 || boundExclusive > 0xffffffff) {
    throw new InvariantViolation('invalid_bound', { bound: String(boundExclusive) });
  }
  if (boundExclusive === 1) return { value: 0, stream };

  const range = 0x100000000;
  const limit = range - (range % boundExclusive);
  let current = stream;
  for (;;) {
    const draw = xoshiro128ssNext(current);
    if (draw.value < limit) {
      return { value: draw.value % boundExclusive, stream: draw.stream };
    }
    current = draw.stream;
  }
}
