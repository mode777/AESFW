import { describe, expect, it } from 'vitest';
import type { EntityDto, LocationDto } from '@aesfw/protocol';
import { worldMap } from './world-map.js';

const locations: readonly LocationDto[] = [
  {
    entity_id: 1,
    knowledge: 'established',
    active: true,
    owner_id: 'owner.0',
    connection_details: [
      {
        connection_id: 'test.conn.a_b',
        origin_id: 1,
        destination_id: 3,
        base_duration_ticks: 300,
        enabled: true,
      },
    ],
  },
  {
    entity_id: 3,
    knowledge: 'discovered',
    active: false,
    connection_details: [
      {
        connection_id: 'test.conn.a_b',
        origin_id: 1,
        destination_id: 3,
        base_duration_ticks: 300,
        enabled: true,
      },
    ],
  },
];

const entities: readonly EntityDto[] = [
  { entity_id: 5, location_id: 1, transport: { state: 'moving', order_id: 6 } },
];

describe('[REF-12.1] world-map selector', () => {
  it('[REF-12.1] lays locations out in ascending entity-id order', () => {
    const model = worldMap(locations, entities);
    expect(model.points.map((point) => point.locationId)).toEqual([1, 3]);
    expect(model.points[0]?.x).toBeLessThan(model.points[1]?.x ?? 0);
  });

  it('[REF-12.1] deduplicates a bidirectional connection', () => {
    const model = worldMap(locations, entities);
    expect(model.connections).toHaveLength(1);
    expect(model.connections[0]?.baseDurationTicks).toBe(300);
  });

  it('[REF-12.1] places transport dots at their authoritative location', () => {
    const model = worldMap(locations, entities);
    expect(model.transports).toEqual([
      { entityId: 5, x: model.points[0]?.x, y: model.points[0]?.y, state: 'moving', orderId: 6 },
    ]);
  });

  it('[REF-12.1] an unknown location is marked unknown', () => {
    const model = worldMap([{ entity_id: 9, knowledge: 'unknown' }], []);
    expect(model.points[0]?.knowledge).toBe('unknown');
  });
});

describe('[REF-12.1] fog rendering model', () => {
  it('[REF-12.1][PIC-9.3] an unknown location keeps only its identity in the model', () => {
    const model = worldMap(
      [
        { entity_id: 1, knowledge: 'unknown', inventories: [] },
        {
          entity_id: 2,
          knowledge: 'discovered',
          active: true,
          inventories: [],
          properties: { tags: [], values: { 'test.property.a': 500 } },
        },
      ],
      [],
    );
    const unknown = model.points.find((point) => point.locationId === 1);
    const discovered = model.points.find((point) => point.locationId === 2);
    // The model carries only what the snapshot holds; the view renders the
    // dashed class from the knowledge level alone.
    expect(unknown?.knowledge).toBe('unknown');
    expect(discovered?.knowledge).toBe('discovered');
    expect(discovered?.active).toBe(true);
  });
});
