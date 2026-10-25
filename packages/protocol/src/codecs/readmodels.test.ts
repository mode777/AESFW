import { describe, expect, it } from 'vitest';
import {
  decodeEntityDetail,
  decodeExchangeQuotes,
  decodeLocationSummary,
  decodeNeedBreakdown,
  decodePlanning,
  decodeTransportDetail,
} from '../index.js';

describe('[PIC-10.1] entity detail codec', () => {
  it('[PIC-10.1] entity detail without an entity id is rejected', () => {
    const decoded = decodeEntityDetail({ definition_id: 'test.entity.producer' });
    expect(decoded.ok).toBe(false);
    if (!decoded.ok) expect(decoded.error[0]?.path).toBe('entity_id');
  });
});

describe('[PIC-10.3] need breakdown codec', () => {
  it('[PIC-10.3] a need breakdown decodes', () => {
    const decoded = decodeNeedBreakdown({
      entity_id: 7,
      need_id: 'test.need.a',
      demand: 1000,
      delivered: 800,
      fulfillment: 800,
      category: 'test.need_category.a',
      category_result: 800,
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.fulfillment).toBe(800);
  });
});

describe('[PIC-10.5] planning codec', () => {
  it('[PIC-10.5] a planning read model decodes', () => {
    const decoded = decodePlanning({
      owner_id: 'owner.0',
      resources: [
        {
          resource_id: 'test.resource.metal',
          scopes: [
            {
              scope: 'owner',
              net_per_tick: 2,
              tiers: [
                {
                  tier_id: 'test.tier.a',
                  per_capita_permille: 2000,
                  supported: 1,
                  consuming_population: 1,
                  coverage_permille: 1000,
                },
              ],
            },
          ],
        },
      ],
      chains: [],
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) {
      expect(decoded.value.resources[0]?.scopes[0]?.tiers[0]?.supported).toBe(1);
    }
  });

  it('[PIC-10.5] a planning scope without scope is rejected', () => {
    const decoded = decodePlanning({
      owner_id: 'owner.0',
      resources: [{ resource_id: 'test.resource.metal', scopes: [{ net_per_tick: 2, tiers: [] }] }],
      chains: [],
    });
    expect(decoded.ok).toBe(false);
  });
});

describe('[PIC-10.4] transport detail codec', () => {
  it('[PIC-10.4] decodes a transport detail', () => {
    const decoded = decodeTransportDetail({
      entity_id: 5,
      order_id: 6,
      mode: 'route',
      state: 'handling',
      current_station: 1,
      connection_path: ['test.conn.a_b'],
      stations: [
        {
          endpoint_id: '1',
          actions: [{ resource_id: 'test.resource.a', action: 'load', rule_mode: 'all' }],
        },
      ],
      cargo: {
        policy: 'typed_slots',
        slots: [{ slot: 0, resource_id: 'test.resource.a', quantity: 40 }],
      },
      progress: { action_index: 0, handled: 5, target: 40 },
      failure_reasons: ['cargo_cannot_unload'],
    });
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.stations?.[0]?.actions[0]?.rule_mode).toBe('all');
    expect(decoded.value.cargo?.slots[0]?.quantity).toBe(40);
  });

  it('[PIC-10.4] rejects a malformed transport detail', () => {
    expect(decodeTransportDetail({ entity_id: 5 }).ok).toBe(false);
  });
});

describe('[PIC-10.2] location summary codec', () => {
  it('[PIC-10.2][CONT-6.18] a summary with a region decodes', () => {
    const decoded = decodeLocationSummary({
      entity_id: 1,
      knowledge: 'discovered',
      active: true,
      region: 'test.region.alpha',
    });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.region).toBe('test.region.alpha');
  });

  it('[PIC-10.2][CONT-6.18] a summary without a region omits the field', () => {
    const decoded = decodeLocationSummary({ entity_id: 1, knowledge: 'unknown', active: false });
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value.region).toBeUndefined();
  });
});

describe('[PIC-10.7] exchange quotes codec', () => {
  it('[PIC-10.7] decodes exchange quotes', () => {
    const decoded = decodeExchangeQuotes({
      entity_id: 9,
      location_id: 2,
      region_id: 'test.region.alpha',
      currency_id: 'test.resource.credits',
      revision: 41,
      goods: [
        {
          resource_id: 'test.resource.a',
          buy: 1200,
          sell: 640,
          base_buy: 1000,
          base_sell: 800,
          recent_sold: 300,
          recent_bought: 0,
          buy_recovery_ticks: 0,
          sell_recovery_ticks: 5,
        },
      ],
    });
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.region_id).toBe('test.region.alpha');
    expect(decoded.value.goods[0]?.sell).toBe(640);
    expect(decoded.value.goods[0]?.sell_recovery_ticks).toBe(5);
  });

  it('[PIC-10.7] rejects a malformed exchange quotes DTO', () => {
    expect(decodeExchangeQuotes({ entity_id: 9 }).ok).toBe(false);
    expect(
      decodeExchangeQuotes({ entity_id: 9, location_id: 2, currency_id: 1, revision: 0, goods: [] })
        .ok,
    ).toBe(false);
  });
});
