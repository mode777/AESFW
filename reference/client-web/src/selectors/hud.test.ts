/**
 * HUD selectors (REF-11): the viewed location, the resource bar, and the
 * location banner.
 *
 * Source: REF-11, PIC-9.3, PIC-10.2, PIC-10.6
 */
import { describe, expect, it } from 'vitest';

import type { DefinitionMetadataDto, LocationDto, SnapshotDto } from '@aesfw/protocol';

import { createFormatter } from '../format/index.js';
import { locationBanner, resourceBar, viewedLocation, definitionLabel, categoryOf } from './hud.js';

const formatter = createFormatter({
  baseScale: 6000,
  grouping: true,
  decimals: 0,
  perMinute: true,
  tickDurationMs: 1000,
});

const location = (overrides: Partial<LocationDto> = {}): LocationDto => ({
  entity_id: 1,
  definition_id: 'ref.tier.location.alpha_1',
  knowledge: 'established',
  active: true,
  owner_id: 'owner.0',
  properties: {
    tags: ['ref.tier.slot.v_a'],
    region: 'ref.tier.region.alpha',
    values: { 'ref.tier.property.suitability_p1': 1000 },
  },
  ...overrides,
});

const projection = (locations: readonly LocationDto[]): SnapshotDto => ({
  session_id: 's',
  tick: 0,
  revision: 0,
  configuration_checksum: 'c',
  owners: [],
  locations,
  entities: [],
});

const definitions: readonly DefinitionMetadataDto[] = [
  {
    definition_id: 'ref.tier.resource.bm1',
    definition_type: 'resource',
    tags: ['storable', 'ref.tier.role.construction'],
    parameters: {},
  },
  {
    definition_id: 'ref.tier.resource.bm2',
    definition_type: 'resource',
    tags: ['storable', 'ref.tier.role.construction'],
    parameters: {},
  },
  {
    definition_id: 'ref.tier.resource.h1',
    definition_type: 'resource',
    tags: ['storable', 'ref.tier.role.intermediate'],
    presentation_key: 'H1',
    parameters: {},
  },
];

describe('[REF-11] HUD selectors', () => {
  it('[REF-11] the viewed location follows the selection, else the first known', () => {
    const known = location();
    const unknown = location({ entity_id: 2, knowledge: 'unknown' });
    const snapshot = projection([unknown, known]);
    expect(viewedLocation(snapshot, null)?.entity_id).toBe(1);
    expect(viewedLocation(snapshot, 1)?.entity_id).toBe(1);
    // Selecting an unknown location falls back to the first known one.
    expect(viewedLocation(snapshot, 2)?.entity_id).toBe(1);
    expect(viewedLocation(null, null)).toBeNull();
  });

  it('[REF-11] the resource bar shows the balance, net rate, and construction chips', () => {
    const model = resourceBar(
      { resources: { 'ref.tier.resource.credits': 6_000_000 }, balance: { net_per_interval: 100 } },
      {
        entity_id: 1,
        knowledge: 'established',
        active: true,
        inventory_totals: {
          'ref.tier.resource.bm1': 24_000,
          'ref.tier.resource.bm2': 6_000,
        },
      },
      definitions,
      [],
      formatter,
    );
    expect(model.balance).toBe('1,000');
    expect(model.netRate).toBe('+1/min');
    expect(model.chips.map((chip) => [chip.resourceId, chip.value])).toEqual([
      ['ref.tier.resource.bm1', '4'],
      ['ref.tier.resource.bm2', '1'],
    ]);
    expect(model.chips.every((chip) => !chip.pinned)).toBe(true);
  });

  it('[REF-11] pinned resources are appended in pin order and marked', () => {
    const model = resourceBar(
      undefined,
      null,
      definitions,
      ['ref.tier.resource.bm1', 'ref.tier.resource.h1'],
      formatter,
    );
    expect(model.chips.map((chip) => chip.resourceId)).toEqual([
      'ref.tier.resource.bm1',
      'ref.tier.resource.bm2',
      'ref.tier.resource.h1',
    ]);
    expect(model.chips.find((chip) => chip.resourceId === 'ref.tier.resource.h1')?.pinned).toBe(
      true,
    );
    // Missing stocks render as zero, never as a guess.
    expect(model.chips.find((chip) => chip.resourceId === 'ref.tier.resource.h1')?.value).toBe('0');
  });

  it('[REF-11] the banner shows code, region, ownership, slots, and suitability', () => {
    expect(locationBanner(location())).toEqual({
      code: 'alpha_1',
      region: 'ref.tier.region.alpha',
      owned: true,
      slotTypes: ['ref.tier.slot.v_a'],
      suitability: [{ property: 'ref.tier.property.suitability_p1', permille: 1000 }],
    });
  });

  it('[PIC-9.3] an unknown location renders no banner', () => {
    expect(locationBanner(null)).toBeNull();
    expect(locationBanner(location({ knowledge: 'unknown' }))).toBeNull();
  });

  it('[REF-11] labels fall back to the code when no presentation key exists', () => {
    expect(definitionLabel('ref.tier.resource.h1', definitions)).toBe('H1');
    expect(definitionLabel('ref.tier.resource.c9', definitions)).toBe('C9');
  });

  it('[REF-12.3] the build category comes from the generated mapping', () => {
    expect(categoryOf('ref.tier.entity.residence_s1')).toBe('ref.tier.category.s1');
    expect(categoryOf('ref.tier.entity.combiner_c1')).toBe('ref.tier.category.s2');
    expect(categoryOf('ref.tier.entity.absent')).toBeNull();
  });
});
