import { describe, expect, it } from 'vitest';
import { fnv1a64, hashCanonical, utf8Bytes } from './hash.js';

const referenceUtf8 = (text: string): number[] => {
  const bytes: number[] = [];
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x80) bytes.push(codePoint);
    else if (codePoint < 0x800) bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    else if (codePoint < 0x10000) {
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
};

const referenceFnv1a64 = (text: string): string => {
  let hash = 0xcbf29ce484222325n;
  for (const byte of referenceUtf8(text)) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
};

describe('[TDS-19.4] FNV-1a 64 state hash', () => {
  it('[TDS-19.4] empty input hashes to the FNV-1a offset basis', () => {
    expect(fnv1a64('')).toBe('cbf29ce484222325');
  });

  it('[TDS-19.4] a single ASCII byte matches the FNV-1a vector', () => {
    expect(fnv1a64('a')).toBe('af63dc4c8601ec8c');
  });

  it('[TDS-19.4] multi-byte input hashes over UTF-8 bytes', () => {
    for (const text of ['', 'a', 'abc', 'héllo', '日本語', '🙂', 'a\u0000b']) {
      expect(fnv1a64(text)).toBe(referenceFnv1a64(text));
      expect(fnv1a64(text)).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it('[TDS-19.4] hashCanonical hashes the canonical encoding', () => {
    expect(hashCanonical({ a: 1 })).toBe(fnv1a64('{"a":1}'));
  });

  it('[TDS-19.4] the UTF-8 encoder replaces lone surrogates', () => {
    expect(utf8Bytes('\ud800')).toEqual([0xef, 0xbf, 0xbd]);
  });
});
