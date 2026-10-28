/**
 * Context panels (REF-12.3): dispatch by selection, the residence checklist,
 * the producer and hub panels, the location panel's knowledge gating, and the
 * command-bearing actions.
 *
 * Source: REF-12.3, PIC-9.3, PIC-10.1, PIC-10.2, PIC-10.3
 */
import { describe, expect, it } from 'vitest';

import type { DefinitionMetadataDto, EntityDetailDto, LocationDto } from '@aesfw/protocol';

import { createFormatter } from '../format/index.js';
import { contextPanel, hubInventoryRows, locationPanel, showsBuildMenu } from './context-panel.js';

const formatter = createFormatter({
  baseScale: 6000,
  grouping: true,
  decimals: 0,
  perMinute: true,
  tickDurationMs: 1000,
});

const detail = (overrides: Partial<EntityDetailDto> = {}): EntityDetailDto => ({
  entity_id: 14,
  definition_id: 'ref.tier.entity.residence_s1',
  lifecycle: 'active',
  enabled: true,
  available_commands: ['SetEntityEnabled'],
  block_reasons: [],
  ...overrides,
});

const location: LocationDto = {
  entity_id: 1,
  definition_id: 'ref.tier.location.alpha_1',
  knowledge: 'established',
  active: true,
  owner_id: 'owner.0',
  properties: { tags: [], region: 'ref.tier.region.alpha', values: { p: 1000 } },
};

const definitions = (id: string): DefinitionMetadataDto[] => [
  { definition_id: id, definition_type: 'entity', tags: [], parameters: {} },
];

const input = (overrides: Record<string, unknown> = {}) => ({
  selection: 14,
  detail: detail(),
  needs: [],
  summary: null,
  location: null,
  transport: null,
  projection: null,
  formatter,
  archetypeOf: () => 'square',
  ownerId: 'owner.0',
  ...overrides,
});

describe('[REF-12.3] context panel dispatch', () => {
  it('[REF-12.3] a residence shows need bars, satisfaction, and the checklist', () => {
    const panel = contextPanel(
      input({
        needs: [
          {
            entity_id: 14,
            need_id: 'ref.tier.need.c1',
            demand: 10,
            delivered: 8,
            fulfillment: 800,
            category: 'ref.tier.need_category.b1',
            category_result: 800,
            satisfaction: 800,
          },
        ],
        detail: detail({
          residence: {
            population: 10,
            satisfaction: 800,
            band: '0.80+',
            transition_eligibility: [
              {
                transition_id: 'ref.tier.transition.s1_s2',
                eligible: false,
                advancement_enabled: true,
                conditions: [
                  { kind: 'sustained', condition_id: 'z', met: true, ticks: 60, progress: 60 },
                  { kind: 'condition', condition_id: 'pop', met: false },
                ],
              },
            ],
          },
        }),
      }),
    );
    expect(panel?.kind).toBe('residence');
    expect(panel?.bars[0]?.permille).toBe(800);
    expect(panel?.sections.some((section) => section.title === 'Advancement')).toBe(true);
    expect(panel?.actions.find((action) => action.id === 'advance')?.disabled).toBe(true);
  });

  it('[REF-12.3] a producer shows block reasons and the enable toggle', () => {
    const panel = contextPanel(
      input({
        detail: detail({
          definition_id: 'ref.tier.entity.refiner_h1',
          block_reasons: ['missing_capability'],
          production: { state: 'blocked', progress: 0, progress_scale: 30, block_reasons: [] },
          maintenance: { amount: 90_000, policy: 'while_enabled' },
        }),
      }),
    );
    expect(panel?.kind).toBe('producer');
    expect(panel?.sections[0]?.rows.some((row) => row.attention === true)).toBe(true);
    expect(panel?.actions[0]?.command).toBe('SetEntityEnabled');
    expect(panel?.sections[1]?.rows[0]?.value).toBe('15');
  });

  it('[REF-12.3] a hub shows inventory rows with reserved amounts', () => {
    const rows = hubInventoryRows(
      [
        {
          inventory_id: 2,
          entries: [{ resource_id: 'ref.tier.resource.bm1', stored: 24_000, reserved: 6_000 }],
        },
      ],
      formatter,
    );
    expect(rows).toEqual([{ label: 'BM1', value: '4 (1 reserved)' }]);
  });

  it('[REF-12.3] a transport unit shows its order and cargo slots', () => {
    const panel = contextPanel(
      input({
        detail: detail({ definition_id: 'ref.tier.entity.transport_t1' }),
        archetypeOf: () => 'unit',
        transport: {
          entity_id: 5,
          order_id: 7,
          state: 'moving',
          cargo: {
            policy: 'typed_slots',
            slots: [{ slot: 0, resource_id: 'ref.tier.resource.bm1', quantity: 1000 }],
          },
        },
      }),
    );
    expect(panel?.kind).toBe('transport');
    expect(panel?.sections[0]?.rows).toContainEqual({ label: 'Order', value: '7' });
    expect(panel?.sections[0]?.rows).toContainEqual({ label: 'Slot 1', value: 'BM1 1000' });
  });
});

describe('[REF-12.3][PIC-9.3] location panel and build-menu fallback', () => {
  it('[REF-12.3] a known location shows region, ownership, and activation', () => {
    const panel = locationPanel(location, null);
    expect(panel?.kind).toBe('location');
    expect(panel?.sections[0]?.rows).toContainEqual({
      label: 'Region',
      value: 'ref.tier.region.alpha',
    });
    expect(panel?.actions[0]?.command).toBe('DeactivateLocation');
    expect(locationPanel(location, null)?.actions[0]?.label).toBe('Deactivate');
    expect(locationPanel({ ...location, active: false }, null)?.actions[0]?.label).toBe('Activate');
  });

  it('[PIC-9.3] an unknown location reveals only its knowledge state', () => {
    const panel = locationPanel({ ...location, knowledge: 'unknown' }, null);
    expect(panel?.sections[0]?.rows).toHaveLength(2);
    expect(panel?.actions).toEqual([]);
  });

  it('[REF-12.3] nothing selected falls back to the build menu', () => {
    const panel = contextPanel(input({ selection: null, detail: null, location: null }));
    expect(panel).toBeNull();
    expect(showsBuildMenu(null, panel)).toBe(true);
    expect(showsBuildMenu(14, null)).toBe(false);
  });

  it('[REF-12.3] a mapped archetype keeps a producer panel for unknown shapes', () => {
    const panel = contextPanel(
      input({ detail: detail({ definition_id: 'test.entity.custom' }), archetypeOf: () => null }),
    );
    expect(panel?.kind).toBe('producer');
    void definitions;
  });
});
