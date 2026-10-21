import { describe, expect, it } from 'vitest';
import { PROTOCOL_PACKAGE_ID } from './index.js';

describe('[TDS-2] @aesfw/protocol package stub', () => {
  it('[TDS-2] exposes its typed entry and participates in the Vitest workspace', () => {
    expect(PROTOCOL_PACKAGE_ID).toBe('@aesfw/protocol');
  });
});
