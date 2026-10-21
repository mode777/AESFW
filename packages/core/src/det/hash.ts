/**
 * FNV-1a hashing over UTF-8 bytes (TDS-19.4). The 64-bit state is held in two
 * 32-bit limbs and multiplied limb-wise, so no `BigInt` appears in the hot
 * path. `fnv1a64` renders 16 lowercase hex characters. The algorithm is tagged
 * `fnv1a64-canonical-json-v1`; changing it changes state hashes and requires a
 * version bump.
 *
 * Source: TDS-15, TDS-19.3, TDS-19.4
 */
import { canonicalStringify } from './canonical.js';

const FNV1A32_OFFSET = 0x811c9dc5;
const FNV1A32_PRIME = 0x01000193;
const FNV1A64_OFFSET_HI = 0xcbf29ce4;
const FNV1A64_OFFSET_LO = 0x84222325;
const FNV1A64_PRIME_HI = 0x00000100;
const FNV1A64_PRIME_LO = 0x000001b3;

/**
 * Encodes a JavaScript string to UTF-8 bytes without `TextEncoder`. Lone
 * surrogates are replaced with U+FFFD, matching the WHATWG encoding algorithm.
 *
 * Source: TDS-19.4
 */
export function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    let codePoint = text.charCodeAt(index);
    if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      const next = index + 1 < text.length ? text.charCodeAt(index + 1) : 0;
      if (next >= 0xdc00 && next <= 0xdfff) {
        codePoint = 0x10000 + ((codePoint - 0xd800) << 10) + (next - 0xdc00);
        index += 1;
      } else {
        codePoint = 0xfffd;
      }
    } else if (codePoint >= 0xdc00 && codePoint <= 0xdfff) {
      codePoint = 0xfffd;
    }

    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint < 0x10000) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f),
      );
    }
  }
  return bytes;
}

/** Multiplies two 64-bit values given as `[hi, lo]` 32-bit limbs, modulo `2^64`. */
const mul64 = (aHi: number, aLo: number, bHi: number, bLo: number): readonly [number, number] => {
  const a0 = aLo & 0xffff;
  const a1 = aLo >>> 16;
  const a2 = aHi & 0xffff;
  const a3 = aHi >>> 16;
  const b0 = bLo & 0xffff;
  const b1 = bLo >>> 16;
  const b2 = bHi & 0xffff;
  const b3 = bHi >>> 16;

  let c0 = a0 * b0;
  let c1 = (c0 >>> 16) + a0 * b1 + a1 * b0;
  c0 &= 0xffff;
  let c2 = (c1 >>> 16) + a0 * b2 + a1 * b1 + a2 * b0;
  c1 &= 0xffff;
  let c3 = (c2 >>> 16) + a0 * b3 + a1 * b2 + a2 * b1 + a3 * b0;
  c2 &= 0xffff;
  c3 &= 0xffff;

  const lo = ((c1 << 16) | c0) >>> 0;
  const hi = ((c3 << 16) | c2) >>> 0;
  return [hi, lo];
};

/**
 * Computes the 32-bit FNV-1a hash of the UTF-8 bytes of `text`.
 *
 * Source: TDS-15
 */
export function fnv1a32(text: string): number {
  let hash = FNV1A32_OFFSET;
  for (const byte of utf8Bytes(text)) {
    hash ^= byte;
    hash = Math.imul(hash, FNV1A32_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Computes the 64-bit FNV-1a hash of the UTF-8 bytes of `text`, rendered as 16
 * lowercase hex characters (algorithm `fnv1a64-canonical-json-v1`).
 *
 * Source: TDS-19.4
 */
export function fnv1a64(text: string): string {
  let hi = FNV1A64_OFFSET_HI;
  let lo = FNV1A64_OFFSET_LO;
  for (const byte of utf8Bytes(text)) {
    lo = (lo ^ byte) >>> 0;
    const product = mul64(hi, lo, FNV1A64_PRIME_HI, FNV1A64_PRIME_LO);
    hi = product[0];
    lo = product[1];
  }
  return `${hi.toString(16).padStart(8, '0')}${lo.toString(16).padStart(8, '0')}`;
}

/**
 * Hashes the canonical JSON encoding of `value` (TDS-19.4):
 * `fnv1a64(canonicalStringify(value))`.
 *
 * Source: TDS-19.3, TDS-19.4
 */
export function hashCanonical(value: unknown): string {
  return fnv1a64(canonicalStringify(value));
}
