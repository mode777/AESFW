import { describe, expect, it } from 'vitest';
import type { SnapshotDeltaDto, SnapshotDto } from '@aesfw/protocol';
import { createMirror } from './mirror.js';

const snapshot = (revision: number): SnapshotDto => ({
  session_id: 's1',
  tick: revision,
  revision,
  configuration_checksum: 'c',
  owners: [],
  locations: [],
  entities: [],
});

const delta = (fromRevision: number, toRevision: number): SnapshotDeltaDto => ({
  session_id: 's1',
  from_revision: fromRevision,
  to_revision: toRevision,
  tick: toRevision,
  entity_updates: [],
  inventory_updates: [],
});

describe('[PIC-18] authoritative mirror', () => {
  it('[PIC-18] a matching delta is applied', () => {
    const mirror = createMirror({ requestSnapshot: () => undefined });
    mirror.applySnapshot(snapshot(1));
    mirror.applyDelta(delta(1, 2), []);
    expect(mirror.projection()?.revision).toBe(2);
  });

  it('[PIC-18] a mismatched delta requests a snapshot', () => {
    let requested = 0;
    const mirror = createMirror({
      requestSnapshot: () => {
        requested += 1;
      },
    });
    mirror.applySnapshot(snapshot(1));
    mirror.applyDelta(delta(5, 6), []);
    expect(requested).toBe(1);
    expect(mirror.projection()?.revision).toBe(1);
  });
});
