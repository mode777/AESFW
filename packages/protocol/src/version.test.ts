import { describe, expect, it } from 'vitest';
import { PROTOCOL_VERSION, decodeWorkerRequest } from './index.js';

describe('[TDS-22] protocol version', () => {
  it('[TDS-22] PROTOCOL_VERSION is the integer 1', () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it('[PIC-3] a worker message carries protocol_version and kind', () => {
    const decoded = decodeWorkerRequest({
      kind: 'command',
      protocol_version: 1,
      command: {
        command_id: 'c1',
        actor_id: 'test.owner.1',
        type: 'SetEntityEnabled',
        payload: { entity_id: 100, enabled: true },
      },
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.kind).toBe('command');
  });
});
