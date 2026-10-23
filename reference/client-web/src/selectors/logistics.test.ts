import { describe, expect, it } from 'vitest';
import type { SnapshotDto, TransportOrderDto } from '@aesfw/protocol';
import {
  draftFromOrder,
  draftPayload,
  draftValid,
  emptyDraft,
  logisticsView,
  transportUnits,
} from './logistics.js';

const projection: SnapshotDto = {
  session_id: 'session.1',
  tick: 10,
  revision: 10,
  configuration_checksum: 'checksum',
  owners: [],
  locations: [{ entity_id: 1, knowledge: 'established', active: true }],
  entities: [
    { entity_id: 5, location_id: 1, transport: { state: 'moving', order_id: 9 } },
    { entity_id: 6, location_id: 1 },
  ],
};

const orders: readonly TransportOrderDto[] = [
  {
    order_id: 9,
    mode: 'route',
    repeat: true,
    stations: [
      {
        endpoint_id: '1',
        actions: [{ resource_id: 'test.resource.a', action: 'load', rule_mode: 'all' }],
      },
      {
        endpoint_id: '3',
        actions: [
          {
            resource_id: 'test.resource.a',
            action: 'unload',
            rule_mode: 'fixed',
            quantity: 10,
          },
        ],
      },
    ],
  },
];

describe('[REF-12.4] logistics selector', () => {
  it('[REF-12.4] lists transport units and excludes other entities', () => {
    expect(transportUnits(projection)).toEqual([{ entityId: 5, state: 'moving', orderId: 9 }]);
  });

  it('[REF-12.4] builds order rows and a view model', () => {
    const model = logisticsView(projection, orders, null, null);
    expect(model.orders).toEqual([{ orderId: 9, mode: 'route', stationCount: 2, repeat: true }]);
    expect(model.locations).toHaveLength(1);
  });

  it('[REF-12.4] round-trips an order through a draft and payload', () => {
    const draft = draftFromOrder(orders[0] as TransportOrderDto);
    expect(draft.stations[1]?.actions[0]).toEqual({
      resourceId: 'test.resource.a',
      action: 'unload',
      ruleMode: 'fixed',
      quantity: 10,
    });
    expect(draftPayload(draft)).toEqual({
      mode: 'route',
      repeat: true,
      stations: [
        {
          endpoint: 1,
          actions: [
            {
              resource: 'test.resource.a',
              action: 'load',
              rule: { mode: 'all' },
            },
          ],
        },
        {
          endpoint: 3,
          actions: [
            {
              resource: 'test.resource.a',
              action: 'unload',
              rule: { mode: 'fixed', quantity: 10 },
            },
          ],
        },
      ],
    });
  });

  it('[REF-12.4] validates a draft', () => {
    expect(draftValid(emptyDraft(1, 3, 'test.resource.a'))).toBe(true);
    expect(draftValid({ ...emptyDraft(1, 3, 'test.resource.a'), stations: [] })).toBe(false);
  });
});
