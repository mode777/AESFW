import { describe, expect, it } from 'vitest';
import { decodeCommandEnvelope, decodeCommandResult } from '../index.js';

describe('[PIC-12] command envelope codec', () => {
  it('[PIC-12] a valid command envelope decodes', () => {
    const decoded = decodeCommandEnvelope({
      command_id: 'c1',
      actor_id: 'test.owner.1',
      type: 'SetEntityEnabled',
      payload: { entity_id: 100, enabled: true },
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.command_id).toBe('c1');
      expect(decoded.value.type).toBe('SetEntityEnabled');
    }
  });

  it('[PIC-12] a command envelope without an actor is rejected', () => {
    const decoded = decodeCommandEnvelope({
      command_id: 'c1',
      type: 'SetEntityEnabled',
      payload: {},
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) {
      expect(decoded.error[0]?.code).toBe('protocol.invalid_field');
      expect(decoded.error[0]?.path).toBe('actor_id');
    }
  });

  it('[PIC-12] a command envelope with a negative revision is rejected', () => {
    const decoded = decodeCommandEnvelope({
      command_id: 'c1',
      actor_id: 'test.owner.1',
      expected_session_revision: -1,
      type: 'SetEntityEnabled',
      payload: {},
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.code).toBe('protocol.invalid_field');
  });
});

describe('[PIC-13] command result codec', () => {
  it('[PIC-13] an accepted result decodes', () => {
    const decoded = decodeCommandResult({
      command_id: 'c1',
      status: 'accepted',
      scheduled_tick: 5,
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.status).toBe('accepted');
  });

  it('[PIC-13] a rejected result without errors is rejected', () => {
    const decoded = decodeCommandResult({
      command_id: 'c1',
      status: 'rejected',
      current_revision: 4,
      errors: [],
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.code).toBe('protocol.invalid_field');
  });
});
