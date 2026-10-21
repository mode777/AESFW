/**
 * `det` — deterministic primitives (TDS-7, TDS-9.4, TDS-15, TDS-19.3,
 * TDS-19.4): canonical JSON, FNV-1a hashing, seeded random streams, and
 * total-order sorting.
 *
 * Source: TDS-9.4, TDS-15, TDS-19.3, TDS-19.4
 */
export { canonicalStringify } from './canonical.js';
export { utf8Bytes, fnv1a32, fnv1a64, hashCanonical } from './hash.js';
export { splitmix32, createStream, xoshiro128ssNext, nextInt } from './rng.js';
export type { Seed, RngStream, RngDraw, IntDraw, Uint32 } from './rng.js';
export { compareStrings, stableSort } from './sort.js';
