/**
 * Tests for the progression selectors (REF-12.3, REF-12.4).
 *
 * Source: REF-12.3, REF-12.4, PIC-10.1, PIC-4
 */
import { describe, expect, it } from 'vitest';
import type {
  DefinitionMetadataDto,
  EntityDetailDto,
  LocationSummaryDto,
  SnapshotDto,
} from '@aesfw/protocol';
import { coverageOverlay, residenceChecklist, tierPyramid } from './progression.js';

const summary = (
  entityId: number,
  tiers: Readonly<Record<string, number>>,
): LocationSummaryDto => ({
  entity_id: entityId,
  knowledge: 'discovered',
  active: true,
  population_by_tier: tiers,
});

describe('[REF-12.4] tier pyramid', () => {
  it('[REF-12.4] groups population by location and orders tiers by ID', () => {
    const model = tierPyramid([
      summary(2, { 'tier.b': 4, 'tier.a': 8 }),
      summary(1, { 'tier.a': 2 }),
    ]);
    expect(model.locations.map((entry) => entry.locationId)).toEqual([1, 2]);
    expect(model.locations[1]?.tiers).toEqual([
      { tierId: 'tier.a', population: 8 },
      { tierId: 'tier.b', population: 4 },
    ]);
  });
});

describe('[REF-12.3] residence checklist', () => {
  it('[REF-12.3] exposes the transition eligibility from the detail', () => {
    const detail = {
      entity_id: 3,
      definition_id: 'test.entity.residence',
      lifecycle: 'active',
      enabled: true,
      available_commands: [],
      block_reasons: [],
      residence: {
        population: 4,
        satisfaction: 900,
        band: '0',
        transition_eligibility: [
          {
            transition_id: 'test.transition.up',
            eligible: false,
            advancement_enabled: true,
            conditions: [
              {
                kind: 'sustained',
                condition_id: 'test.condition.ready',
                met: false,
                ticks: 3,
                progress: 1,
              },
            ],
          },
        ],
      },
    } satisfies EntityDetailDto;
    expect(residenceChecklist(detail)).toHaveLength(1);
    expect(residenceChecklist(detail)[0]?.conditions[0]?.progress).toBe(1);
    expect(residenceChecklist(null)).toEqual([]);
  });
});

describe('[REF-12.2] coverage overlay', () => {
  it('[REF-12.2] derives circles from coverage-provider metadata', () => {
    const metadata: readonly DefinitionMetadataDto[] = [
      {
        definition_id: 'test.entity.market',
        definition_type: 'entity',
        tags: [],
        parameters: {
          components: {
            service_provider: {
              mode: 'coverage',
              service: 'test.service.market',
              relation: { type: 'radius', cells: 6 },
            },
          },
        },
      },
    ];
    const projection = {
      session_id: 's',
      tick: 1,
      revision: 1,
      configuration_checksum: 'c',
      owners: [],
      locations: [],
      entities: [
        {
          entity_id: 5,
          definition_id: 'test.entity.market',
          location_id: 1,
          spatial: { logical_position: [2, 3], orientation: 0 },
        },
      ],
    } satisfies SnapshotDto;
    expect(coverageOverlay(projection, metadata)).toEqual([
      { entityId: 5, service: 'test.service.market', radius: 6 },
    ]);
  });
});
