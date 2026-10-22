import { describe, expect, it } from 'vitest';
import { decodeCommandEnvelope, decodeWorkerRequest } from '../index.js';

describe('[TDS-22] codec error catalogue', () => {
  it('[TDS-22] a non-object input is rejected', () => {
    const decoded = decodeCommandEnvelope(null);
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.code).toBe('protocol.invalid_field');
  });

  it('[TDS-22] an unknown worker message kind is rejected', () => {
    const decoded = decodeWorkerRequest({ kind: 'nope', protocol_version: 1 });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.code).toBe('protocol.unknown_kind');
  });
});
