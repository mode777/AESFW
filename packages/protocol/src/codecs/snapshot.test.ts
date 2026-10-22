import { describe, expect, it } from 'vitest';
import { decodeSnapshot, decodeSnapshotDelta } from '../index.js';

describe('[PIC-9] snapshot codec', () => {
  it('[PIC-9] a minimal snapshot decodes', () => {
    const decoded = decodeSnapshot({
      session_id: 's1',
      tick: 0,
      revision: 0,
      configuration_checksum: 'abc',
      owners: [{ owner_id: 'test.owner.1', resources: {} }],
      locations: [],
      entities: [],
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.owners).toHaveLength(1);
  });

  it('[PIC-9] a snapshot without a tick is rejected', () => {
    const decoded = decodeSnapshot({
      session_id: 's1',
      revision: 0,
      configuration_checksum: 'abc',
      owners: [],
      locations: [],
      entities: [],
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('tick');
  });
});

describe('[PIC-9] snapshot delta codec', () => {
  it('[PIC-9] a delta decodes', () => {
    const decoded = decodeSnapshotDelta({
      session_id: 's1',
      from_revision: 1,
      to_revision: 2,
      tick: 3,
      entity_updates: [],
      inventory_updates: [],
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.to_revision).toBe(2);
  });
});
