/**
 * Placement packing for scripted strategies (REF-8). The packer is pure and
 * content-driven, so it is unit-tested on a synthetic grid independent of the
 * reference package.
 *
 * Source: REF-8
 */
import { describe, expect, it } from 'vitest';

import { createMemorySource, loadContent } from '@aesfw/content';
import type { ContentRegistry } from '@aesfw/content';
import { packPlacements } from './strategies.js';

const content = (): ContentRegistry => {
  const manifest = [
    'package:',
    '  id: test.balance',
    '  version: 1.0.0',
    '  schema_version: 1',
    '  type: simulation_content',
    '  files: [content.yaml]',
    '',
  ].join('\n');
  const body = [
    'location_templates:',
    '  - id: test.location.grid',
    '    spatial_policy: framework.spatial.grid',
    '    spatial_parameters:',
    '      width: 8',
    '      height: 8',
    '      blocked_cells: [0, 1, 2, 3, 4, 5, 6, 7]',
    '    inventories:',
    '      - id: shared',
    '        capacity: { mode: total, quantity: 1000 }',
    '        access_policy: framework.inventory.shared_location',
    '    activation: { initial: true }',
    'entity_definitions:',
    '  - id: test.entity.large',
    '    components:',
    '      placement: { footprint: [3, 3] }',
    '  - id: test.entity.small',
    '    components:',
    '      placement: { footprint: [2, 2] }',
    '',
  ].join('\n');
  const loaded = loadContent(
    [createMemorySource('test.balance', { 'package.yaml': manifest, 'content.yaml': body })],
    { strictness: 'strict' },
  );
  if (loaded.content === null) throw new Error('fixture content failed to load');
  return loaded.content.registry as ContentRegistry;
};

const grid = { width: 8, height: 8, blocked: [0, 1, 2, 3, 4, 5, 6, 7] };

describe('[REF-8] strategy placement packing', () => {
  it('[REF-8] packs the largest footprint first and keeps command order', () => {
    const registry = content();
    const placements = packPlacements(registry, grid, [
      { definition: 'test.entity.small', tick: 1 },
      { definition: 'test.entity.large', tick: 2 },
    ]);
    expect(placements).not.toBeNull();
    // The 3x3 is claimed before the 2x2 even though it is listed second.
    expect(placements?.map((entry) => entry.definition)).toEqual([
      'test.entity.small',
      'test.entity.large',
    ]);
    expect(placements?.[1]).toMatchObject({ x: 0, y: 1 });
    expect(placements?.[0]).toMatchObject({ x: 3, y: 1 });
  });

  it('[REF-8] reports a plan that does not fit instead of placing partially', () => {
    const registry = content();
    const steps = Array.from({ length: 5 }, () => ({
      definition: 'test.entity.large',
      tick: 1,
    }));
    expect(packPlacements(registry, grid, steps)).toBeNull();
  });

  it('[REF-8] packing is deterministic', () => {
    const registry = content();
    const steps = [
      { definition: 'test.entity.small', tick: 1 },
      { definition: 'test.entity.large', tick: 1 },
      { definition: 'test.entity.small', tick: 1 },
    ];
    expect(packPlacements(registry, grid, steps)).toEqual(packPlacements(registry, grid, steps));
  });
});
