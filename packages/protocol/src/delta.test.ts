import { describe, expect, it } from 'vitest';
import { applyDelta, canApplyDelta } from './index.js';
import type { SnapshotDeltaDto, SnapshotDto } from './index.js';

const base: SnapshotDto = {
  session_id: 's1',
  tick: 0,
  revision: 0,
  configuration_checksum: 'c',
  owners: [],
  locations: [
    {
      entity_id: 1,
      knowledge: 'established',
      active: true,
      inventories: [
        {
          inventory_id: 2,
          entries: [{ resource_id: 'test.resource.a', stored: 100, reserved: 0 }],
        },
      ],
    },
  ],
  entities: [
    {
      entity_id: 3,
      revision: 0,
      production: { state: 'idle', progress: 0, progress_scale: 1000, block_reasons: [] },
    },
  ],
};

const next: SnapshotDto = {
  ...base,
  tick: 1,
  revision: 1,
  locations: [
    {
      entity_id: 1,
      knowledge: 'established',
      active: true,
      inventories: [
        { inventory_id: 2, entries: [{ resource_id: 'test.resource.a', stored: 80, reserved: 0 }] },
      ],
    },
  ],
  entities: [
    {
      entity_id: 3,
      revision: 1,
      production: { state: 'processing', progress: 50, progress_scale: 1000, block_reasons: [] },
    },
  ],
};

const delta: SnapshotDeltaDto = {
  session_id: 's1',
  from_revision: 0,
  to_revision: 1,
  tick: 1,
  entity_updates: [
    {
      entity_id: 3,
      component: 'revision',
      fields: { revision: 1 },
    },
    {
      entity_id: 3,
      component: 'production',
      fields: { production: next.entities[0]?.production as never },
    },
  ],
  inventory_updates: [{ inventory_id: 2, resource_id: 'test.resource.a', stored: 80, reserved: 0 }],
};

describe('[PIC-18] applyDelta', () => {
  it('[PIC-18] applying a delta round-trips to the next snapshot', () => {
    expect(applyDelta(base, delta)).toEqual(next);
  });

  it('[PIC-18] a matching base can apply', () => {
    expect(canApplyDelta(base, delta)).toBe(true);
  });

  it('[PIC-18] a mismatched base revision cannot apply', () => {
    expect(canApplyDelta({ ...base, revision: 5 }, delta)).toBe(false);
  });

  it('[PIC-18] a mismatched session cannot apply', () => {
    expect(canApplyDelta({ ...base, session_id: 's2' }, delta)).toBe(false);
  });
});
