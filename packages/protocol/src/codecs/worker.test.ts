import { describe, expect, it } from 'vitest';
import { decodeWorkerRequest, decodeWorkerResponse } from '../index.js';

describe('[TDS-21.1] worker request codec', () => {
  it('[TDS-21.1] a command request decodes', () => {
    const decoded = decodeWorkerRequest({
      kind: 'command',
      protocol_version: 1,
      command: {
        command_id: 'c1',
        actor_id: 'test.owner.1',
        type: 'SetEntityEnabled',
        payload: {},
      },
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.kind).toBe('command');
  });

  it('[TDS-21.1] a mismatched protocol version is rejected', () => {
    const decoded = decodeWorkerRequest({ kind: 'control', protocol_version: 2, action: 'pause' });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.code).toBe('protocol.version_mismatch');
  });

  it('[TDS-21.1] a non-integer protocol version is rejected', () => {
    const decoded = decodeWorkerRequest({
      kind: 'control',
      protocol_version: '1',
      action: 'pause',
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.code).toBe('protocol.invalid_field');
  });

  it('[TDS-21.1] a speed control decodes', () => {
    const decoded = decodeWorkerRequest({
      kind: 'control',
      protocol_version: 1,
      action: 'speed',
      speed: 4,
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok && decoded.value.kind === 'control') expect(decoded.value.action).toBe('speed');
  });
});

describe('[TDS-21.1] worker response codec', () => {
  it('[TDS-21.1] a snapshot response decodes', () => {
    const decoded = decodeWorkerResponse({
      kind: 'snapshot',
      protocol_version: 1,
      snapshot: {
        session_id: 's1',
        tick: 0,
        revision: 0,
        configuration_checksum: 'abc',
        owners: [],
        locations: [],
        entities: [],
      },
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.kind).toBe('snapshot');
  });

  it('[TDS-21.1] an unknown response kind is rejected', () => {
    const decoded = decodeWorkerResponse({ kind: 'nope', protocol_version: 1 });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.code).toBe('protocol.unknown_kind');
  });

  it('[TDS-21.1] a delta with a hash decodes', () => {
    const decoded = decodeWorkerResponse({
      kind: 'delta',
      protocol_version: 1,
      delta: {
        session_id: 's1',
        from_revision: 0,
        to_revision: 1,
        tick: 1,
        entity_updates: [],
        inventory_updates: [],
      },
      events: [],
      hash: '0123456789abcdef',
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok && decoded.value.kind === 'delta') {
      expect(decoded.value.hash).toBe('0123456789abcdef');
    }
  });

  it('[TDS-21.1] a delta without a hash decodes', () => {
    const decoded = decodeWorkerResponse({
      kind: 'delta',
      protocol_version: 1,
      delta: {
        session_id: 's1',
        from_revision: 0,
        to_revision: 1,
        tick: 1,
        entity_updates: [],
        inventory_updates: [],
      },
      events: [],
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok && decoded.value.kind === 'delta') expect(decoded.value.hash).toBeUndefined();
  });
});
