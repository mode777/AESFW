import { describe, expect, it } from 'vitest';
import type { PlanningDto } from '@aesfw/protocol';
import { planningView } from './planning-view.js';

const planning = (): PlanningDto => ({
  owner_id: 'owner.0',
  resources: [
    {
      resource_id: 'ref.tier.resource.c1',
      scopes: [
        {
          scope: 'owner',
          net_per_tick: 2,
          tiers: [
            {
              tier_id: 'ref.tier.population.s1',
              per_capita_permille: 2000,
              supported: 1,
              consuming_population: 5,
              coverage_permille: 5000,
            },
          ],
        },
        {
          scope: 'location',
          location_id: 1,
          net_per_tick: 2,
          tiers: [],
        },
      ],
    },
  ],
  chains: [
    {
      resource_id: 'ref.tier.resource.c1',
      output_per_tick: 2,
      stages: [
        {
          definition_id: 'ref.tier.entity.combiner',
          count: 2,
          ratio: 2,
          output_per_tick: 2,
          footprint: 18,
          maintenance_per_interval: 12000,
          capability_demand: { 'ref.tier.capability.s1': 2 },
        },
      ],
    },
  ],
});

describe('[REF-12.4] planningView', () => {
  it('[REF-12.4] tier rows carry supported population and coverage', () => {
    const vm = planningView(planning());
    expect(vm.tierRows).toHaveLength(1);
    expect(vm.tierRows[0]).toEqual({
      resourceId: 'ref.tier.resource.c1',
      scope: 'owner',
      locationId: null,
      netPerTick: 2,
      tierId: 'ref.tier.population.s1',
      perCapitaPermille: 2000,
      supported: 1,
      population: 5,
      coveragePermille: 5000,
    });
  });

  it('[REF-12.4] chain rows carry counts, ratios, and capability demand', () => {
    const vm = planningView(planning());
    expect(vm.chainRows).toHaveLength(1);
    expect(vm.chainRows[0]?.count).toBe(2);
    expect(vm.chainRows[0]?.ratio).toBe(2);
    expect(vm.chainRows[0]?.capabilityDemand).toEqual([
      { capability: 'ref.tier.capability.s1', quantity: 2 },
    ]);
  });

  it('[REF-12.4] an empty planning model yields no rows', () => {
    expect(planningView(null)).toEqual({ tierRows: [], chainRows: [] });
  });
});
