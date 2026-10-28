/**
 * The statistics selector (REF-12.4): the tier pyramid per location and owner,
 * and capability supply.
 *
 * Source: REF-12.4
 */
import { describe, expect, it } from 'vitest';

import type { LocationSummaryDto, SnapshotDto } from '@aesfw/protocol';

import { statisticsView } from './statistics.js';

const summary = (id: number, s1: number, capability: number): LocationSummaryDto => ({
  entity_id: id,
  knowledge: 'established',
  active: true,
  population_by_tier: { 'ref.tier.population.s1': s1 },
  capability_totals: { 'ref.tier.capability.ak1': capability },
});

const projection = (): SnapshotDto => ({
  session_id: 's',
  tick: 0,
  revision: 0,
  configuration_checksum: 'c',
  owners: [
    {
      owner_id: 'owner.0',
      resources: { 'ref.tier.resource.credits': 6_000_000 },
      balance: {
        revenue_per_interval: 0,
        expenses_per_interval: 0,
        net_per_interval: 0,
        deficit_paused_entities: [],
        revenue_by_source: {},
        expenses_by_source: {},
        idle_paying_entities: [],
      },
    },
  ],
  locations: [],
  entities: [],
});

describe('[REF-12.4] statistics', () => {
  it('[REF-12.4] the pyramid totals per location and for the owner', () => {
    const model = statisticsView(projection(), 'owner.0', [summary(2, 20, 20), summary(1, 10, 10)]);
    expect(model.pyramid).toEqual([
      { scope: 'location 1', tierId: 'ref.tier.population.s1', count: 10 },
      { scope: 'location 2', tierId: 'ref.tier.population.s1', count: 20 },
      { scope: 'owner', tierId: 'ref.tier.population.s1', count: 30 },
    ]);
  });

  it('[REF-12.4] capability supply is listed per location', () => {
    const model = statisticsView(projection(), 'owner.0', [summary(1, 10, 10)]);
    expect(model.capabilities).toEqual([
      { locationId: 1, capabilityId: 'ref.tier.capability.ak1', supplied: 10 },
    ]);
  });
});
