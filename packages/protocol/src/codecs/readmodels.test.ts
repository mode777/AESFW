import { describe, expect, it } from 'vitest';
import { decodeEntityDetail, decodeNeedBreakdown, decodePlanning } from '../index.js';

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
