/**
 * Build menu and drag path (REF-12.3, REF-13.3).
 *
 * Source: REF-12.3, REF-13.3
 */
import { describe, expect, it } from 'vitest';

import type { DefinitionMetadataDto } from '@aesfw/protocol';

import { createI18n } from '../i18n/index.js';
import { buildMenu } from './build-menu.js';
import { dragPath } from './drag.js';

const i18n = createI18n({
  'ref.tier.entity.residence_s1': 'Residence S1',
  'ref.tier.entity.combiner_c1': 'Combiner C1',
  'ref.tier.entity.combiner_c1.unlock_hint': 'Requires 150 S1',
  'ref.tier.category.s1': 'S1',
  'ref.tier.category.s2': 'S2',
  'ref.tier.resource.bm1': 'BM1',
});

const definition = (
  id: string,
  overrides: Partial<DefinitionMetadataDto> = {},
): DefinitionMetadataDto => ({
  definition_id: id,
  definition_type: 'entity',
  tags: [],
  parameters: {
    components: {
      placement: { footprint: [3, 3] },
      construction: {
        costs: [{ resource: 'ref.tier.resource.bm1', quantity: 36000 }],
      },
    },
  },
  ...overrides,
});

describe('[REF-12.3] build menu', () => {
  it('[REF-12.3] tabs ascend by category and entries by sort order then ID', () => {
    const menu = buildMenu(
      [definition('ref.tier.entity.residence_s1'), definition('ref.tier.entity.combiner_c1')],
      i18n,
      {},
    );
    expect(menu.map((tab) => tab.categoryKey)).toEqual([
      'ref.tier.category.s1',
      'ref.tier.category.s2',
    ]);
    expect(menu[0]?.entries.map((entry) => entry.definitionId)).toEqual([
      'ref.tier.entity.residence_s1',
    ]);
    expect(menu[0]?.label).toBe('S1');
  });

  it('[REF-12.3] locked definitions carry their unlock hint and costed stock', () => {
    const menu = buildMenu([definition('ref.tier.entity.combiner_c1', { locked: true })], i18n, {
      'ref.tier.resource.bm1': 24_000,
    });
    const entry = menu[0]?.entries[0];
    expect(entry?.locked).toBe(true);
    expect(entry?.unlockHint).toBe('Requires 150 S1');
    expect(entry?.costs).toEqual([{ resourceId: 'ref.tier.resource.bm1', quantity: 36000 }]);
    expect(entry?.stock).toEqual([{ resourceId: 'ref.tier.resource.bm1', quantity: 24_000 }]);
  });

  it('[REF-12.3] definitions without a mapping land in the uncategorised tab', () => {
    const menu = buildMenu([definition('test.entity.unmapped')], i18n, {});
    expect(menu.map((tab) => tab.categoryKey)).toEqual(['uncategorised']);
    expect(menu[0]?.entries[0]?.sortOrder).toBe(0);
  });

  it('[REF-12.3] definitions without placement are not offered', () => {
    const menu = buildMenu(
      [definition('test.entity.hub', { parameters: { components: {} } })],
      i18n,
      {},
    );
    expect(menu).toEqual([]);
  });
});

describe('[REF-13.3] connector drag path', () => {
  it('[REF-13.3] a path runs x first and includes both ends', () => {
    expect(dragPath({ x: 1, y: 1 }, { x: 3, y: 2 })).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
    ]);
  });

  it('[REF-13.3] dragging in each direction stays contiguous', () => {
    expect(dragPath({ x: 3, y: 3 }, { x: 1, y: 0 })).toEqual([
      { x: 3, y: 3 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]);
  });

  it('[REF-13.3] a straight or single-cell drag has no duplicates', () => {
    expect(dragPath({ x: 2, y: 2 }, { x: 2, y: 2 })).toEqual([{ x: 2, y: 2 }]);
    expect(dragPath({ x: 2, y: 2 }, { x: 5, y: 2 })).toEqual([
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ]);
  });
});
