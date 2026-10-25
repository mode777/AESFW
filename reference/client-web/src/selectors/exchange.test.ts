/**
 * Selector tests for the exchange drawer (REF-12.4): the quotes view model,
 * exchange-entity discovery, and the trade-order shortcut draft.
 *
 * Source: REF-12.4, PIC-10.7
 */
import { describe, expect, it } from 'vitest';
import type { ExchangeQuotesDto, SnapshotDto } from '@aesfw/protocol';
import { exchangeEntities, exchangeView, tradeDraft } from './exchange.js';

const quotes: ExchangeQuotesDto = {
  entity_id: 9,
  location_id: 2,
  region_id: 'test.region.alpha',
  currency_id: 'test.resource.credits',
  revision: 41,
  goods: [
    {
      resource_id: 'test.resource.a',
      buy: 1200,
      sell: 720,
      base_buy: 1000,
      base_sell: 800,
      recent_sold: 300,
      recent_bought: 0,
      buy_recovery_ticks: 0,
      sell_recovery_ticks: 5,
    },
  ],
};

describe('[REF-12.4] exchange drawer selectors', () => {
  it('[REF-12.4] the view model carries prices, bases, volume, and recovery', () => {
    const model = exchangeView([quotes]);
    expect(model.exchanges).toHaveLength(1);
    const row = model.exchanges[0];
    expect(row?.entityId).toBe(9);
    expect(row?.regionId).toBe('test.region.alpha');
    const good = row?.goods[0];
    expect(good).toMatchObject({
      resourceId: 'test.resource.a',
      buy: 1200,
      sell: 720,
      baseBuy: 1000,
      baseSell: 800,
      recentSold: 300,
      recentBought: 0,
      sellRecoveryTicks: 5,
    });
  });

  it('[REF-12.4] exchanges are found by their exchange definitions', () => {
    const projection: SnapshotDto = {
      session_id: 'session.1',
      tick: 10,
      revision: 10,
      configuration_checksum: 'checksum',
      owners: [],
      locations: [],
      entities: [
        { entity_id: 3, definition_id: 'test.entity.producer' },
        { entity_id: 9, definition_id: 'test.exchange.port' },
        { entity_id: 4, definition_id: 'test.exchange.other' },
      ],
    };
    expect(exchangeEntities(projection, ['test.exchange.port', 'test.exchange.other'])).toEqual([
      4, 9,
    ]);
    expect(exchangeEntities(projection, [])).toEqual([]);
  });

  it('[REF-12.4] the sell shortcut builds a prefilled trade draft', () => {
    const draft = tradeDraft(9, 'test.resource.a', 'sell', 300);
    expect(draft).toEqual({
      mode: 'trade',
      repeat: false,
      stations: [
        {
          endpointId: 9,
          actions: [
            { resourceId: 'test.resource.a', action: 'sell', ruleMode: 'fixed', quantity: 300 },
          ],
        },
      ],
    });
  });

  it('[REF-12.4] the shortcut quantity defaults to at least one', () => {
    const draft = tradeDraft(9, 'test.resource.a', 'buy', 0);
    expect(draft.stations[0]?.actions[0]?.quantity).toBe(1);
  });
});
