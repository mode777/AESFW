import { describe, expect, it } from 'vitest';

declare const crypto: { getRandomValues(buffer: Uint8Array): Uint8Array };

describe('[TDS-5.5] ambient-API traps in protocol tests', () => {
  it('[TDS-5.5] crypto.getRandomValues throws in a protocol test', () => {
    const buffer = new Uint8Array(8);
    expect(() => crypto.getRandomValues(buffer)).toThrow(/crypto\.getRandomValues/);
  });
});
