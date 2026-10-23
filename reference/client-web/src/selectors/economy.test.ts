import { describe, expect, it } from 'vitest';
import type { OwnerDto, SnapshotDto } from '@aesfw/protocol';
import { economyView, ownerEntry, pushTrend, REFERENCE_BASE_SCALE } from './economy.js';

const owner = (overrides: Partial<OwnerDto> = {}): OwnerDto => ({
  owner_id: 'owner.0',
  resources: { 'ref.tier.resource.credits': 60000 },
  balance: {
    revenue_per_interval: 10,
    expenses_per_interval: 50,
    net_per_interval: -40,
    deficit_paused_entities: [5, 4],
    revenue_by_source: { 'tier.ref.tier.population.s1': 10 },
    expenses_by_source: { 'entity.4': 10, 'entity.3': 50 },
    idle_paying_entities: [3],
  },
  ...overrides,
});

const projection = (owners: readonly OwnerDto[]): SnapshotDto => ({
  session_id: 's1',
  tick: 10,
  revision: 2,
  configuration_checksum: 'checksum',
  owners,
  locations: [],
  entities: [],
});

describe('[REF-12.4] economyView', () => {
  it('[REF-12.4] the economy view carries the balance and rates', () => {
    const vm = economyView(projection([owner()]), 'owner.0', [1, 2]);
    expect(vm.credits).toBe(60000);
    expect(vm.revenuePerTick).toBe(10);
    expect(vm.expensesPerTick).toBe(50);
    expect(vm.netPerTick).toBe(-40);
    expect(REFERENCE_BASE_SCALE).toBe(6000);
  });

  it('[REF-12.4] source rows are sorted and paused entities keep pause order', () => {
    const vm = economyView(projection([owner()]), 'owner.0', []);
    expect(vm.revenue.map((row) => row.source)).toEqual(['tier.ref.tier.population.s1']);
    expect(vm.expenses.map((row) => row.source)).toEqual(['entity.3', 'entity.4']);
    expect(vm.deficitPaused).toEqual([5, 4]);
    expect(vm.idlePaying).toEqual([3]);
  });

  it('[REF-12.4] an unknown owner yields an empty view', () => {
    const vm = economyView(projection([owner()]), 'owner.9', []);
    expect(vm.credits).toBeNull();
    expect(vm.revenue).toEqual([]);
    expect(ownerEntry(projection([]), 'owner.0')).toBeUndefined();
  });

  it('[REF-12.4] the trend keeps the newest samples', () => {
    expect(pushTrend([1, 2], 3, 3)).toEqual([1, 2, 3]);
    expect(pushTrend([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });
});
