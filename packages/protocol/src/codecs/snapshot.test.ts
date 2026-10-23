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

it('[PIC-9.1][CONT-6.18] a location with region and property values decodes', () => {
  const decoded = decodeSnapshot({
    session_id: 's1',
    tick: 0,
    revision: 0,
    configuration_checksum: 'abc',
    owners: [],
    locations: [
      {
        entity_id: 1,
        properties: {
          tags: [],
          region: 'test.region.alpha',
          values: { 'test.property.suitability_c': 1000 },
        },
      },
    ],
    entities: [],
  });
  expect(decoded.ok).toBe(true);
  if (decoded.ok) {
    expect(decoded.value.locations[0]?.properties?.region).toBe('test.region.alpha');
    expect(decoded.value.locations[0]?.properties?.values?.['test.property.suitability_c']).toBe(
      1000,
    );
  }
});

it('[PIC-9.1][CONT-6.18] a malformed location property value is rejected', () => {
  const decoded = decodeSnapshot({
    session_id: 's1',
    tick: 0,
    revision: 0,
    configuration_checksum: 'abc',
    owners: [],
    locations: [
      {
        entity_id: 1,
        properties: { tags: [], values: { 'test.property.suitability_c': 'high' } },
      },
    ],
    entities: [],
  });
  expect(decoded.ok).toBe(false);
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

describe('[PIC-10.6] owner economy wire fields', () => {
  const base = {
    session_id: 's1',
    from_revision: 1,
    to_revision: 2,
    tick: 3,
    entity_updates: [],
    inventory_updates: [],
  };

  it('[PIC-9.2] a delta with owner updates decodes', () => {
    const decoded = decodeSnapshotDelta({
      ...base,
      owner_updates: [
        {
          owner_id: 'owner.0',
          resources: { 'test.resource.credits': 500 },
          balance: {
            revenue_per_interval: 10,
            expenses_per_interval: 50,
            net_per_interval: -40,
            deficit_paused_entities: [3],
            revenue_by_source: { 'tier.9': 10 },
            expenses_by_source: { 'entity.3': 50 },
            idle_paying_entities: [3],
          },
        },
      ],
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.owner_updates).toHaveLength(1);
      expect(decoded.value.owner_updates?.[0]?.balance?.net_per_interval).toBe(-40);
      expect(decoded.value.owner_updates?.[0]?.balance?.revenue_by_source).toEqual({
        'tier.9': 10,
      });
    }
  });

  it('[PIC-9.2] a delta without owner updates decodes', () => {
    const decoded = decodeSnapshotDelta(base);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.owner_updates).toBeUndefined();
  });

  it('[PIC-9.2] a malformed owner update is rejected', () => {
    const decoded = decodeSnapshotDelta({
      ...base,
      owner_updates: [{ resources: {} }],
    });
    expect(decoded.ok).toBe(false);
  });
});
