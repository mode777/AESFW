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

  it('[PIC-9.1] a snapshot with grid, spatial, and connectivity decodes', () => {
    const decoded = decodeSnapshot({
      session_id: 's1',
      tick: 0,
      revision: 0,
      configuration_checksum: 'abc',
      owners: [],
      locations: [{ entity_id: 1, grid: { width: 4, height: 3, blocked: [1, 6] } }],
      entities: [
        {
          entity_id: 3,
          spatial: {
            logical_position: [10, 12],
            orientation: 1,
            footprint: { width: 2, height: 3 },
          },
          connectivity: {
            role: 'requirement',
            network: 'test.connectivity.hub',
            connected: true,
          },
        },
      ],
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.locations[0]?.grid).toEqual({ width: 4, height: 3, blocked: [1, 6] });
      expect(decoded.value.entities[0]?.spatial).toEqual({
        logical_position: [10, 12],
        orientation: 1,
        footprint: { width: 2, height: 3 },
      });
      expect(decoded.value.entities[0]?.connectivity).toEqual({
        role: 'requirement',
        network: 'test.connectivity.hub',
        connected: true,
      });
    }
  });

  it('[PIC-9.1] a malformed grid blocked list is rejected', () => {
    const decoded = decodeSnapshot({
      session_id: 's1',
      tick: 0,
      revision: 0,
      configuration_checksum: 'abc',
      owners: [],
      locations: [{ entity_id: 1, grid: { width: 4, height: 3, blocked: [1, -2] } }],
      entities: [],
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('locations[0].grid.blocked');
  });

  it('[PIC-9.1] a malformed spatial position is rejected', () => {
    const decoded = decodeSnapshot({
      session_id: 's1',
      tick: 0,
      revision: 0,
      configuration_checksum: 'abc',
      owners: [],
      locations: [],
      entities: [{ entity_id: 3, spatial: { logical_position: [10], orientation: 1 } }],
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('entities[0].spatial.logical_position');
  });

  it('[PIC-9.1] a malformed connectivity is rejected', () => {
    const decoded = decodeSnapshot({
      session_id: 's1',
      tick: 0,
      revision: 0,
      configuration_checksum: 'abc',
      owners: [],
      locations: [],
      entities: [
        {
          entity_id: 3,
          connectivity: { role: 'requirement', network: 'test.connectivity.hub', connected: 'yes' },
        },
      ],
    });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('entities[0].connectivity.connected');
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
