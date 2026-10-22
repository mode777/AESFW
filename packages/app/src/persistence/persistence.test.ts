import { describe, expect, it } from 'vitest';
import { hashWorld, instantiateWorld, ids } from '@aesfw/core';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { advance, createSession } from '../session/session.js';
import type { SessionOptions } from '../session/types.js';
import { load } from './load.js';
import { save } from './save.js';

const IDS: Record<string, number> = {
  'test.location.a': 1,
  'test.resource.a': 4,
};

const registry: ContentRegistry = {
  stringIdOf: (type, handle) => {
    for (const [id, value] of Object.entries(IDS)) {
      if (value === handle && id.startsWith(`test.${type}`)) return ids.stringId(id);
    }
    return null;
  },
  handleOf: (type, id) => {
    const value = IDS[id as string];
    return value === undefined ? null : ids.definitionHandle(value);
  },
  definitionOf: () => null,
  definitionsOf: () => [],
  tagsOf: () => [],
};

const content: CompiledContent = {
  registry,
  checksum: 'checksum.1',
  packages: [{ id: 'demo.basic_loop', version: '1.0.0', type: 'simulation_content' }],
  presentation: null,
};

const options: SessionOptions = {
  sessionId: 'session.1',
  seed: [1, 2],
  tickDurationMs: 100,
  world: null,
  enabledModules: [],
  hashInterval: 0,
  journal: false,
  actor: ids.ownerHandle(0),
  actorId: 'test.owner.1',
};

const newSession = () => {
  const created = createSession(content, options);
  if (!created.ok) throw new Error('session creation failed');
  const state = created.value;
  instantiateWorld(state.world, {
    owner: ids.ownerHandle(0),
    locations: [
      {
        template: ids.definitionHandle(1),
        spatialPolicy: 'abstract_capacity',
        capacity: 100,
        properties: [],
        region: null,
        active: true,
        inventories: [
          {
            capacity: { total: 1000, perResource: null },
            acceptance: { accepts: [] },
            policy: 'shared_location',
          },
        ],
      },
    ],
  });
  return state;
};

describe('[TDS-19.1] save', () => {
  it('[TDS-19.1] a save records the tick and checksum', () => {
    const state = advance(newSession(), 5).session;
    const doc = save(state);
    expect(doc.header.tick).toBe(5);
    expect(doc.header.configuration_checksum).toBe('checksum.1');
    expect(doc.header.format).toBe('aesfw-save');
    expect(doc.header.hash_algorithm).toBe('fnv1a64-canonical-json-v1');
  });
});

describe('[TDS-19.1] load', () => {
  it('[TDS-19.1] a matching save loads', () => {
    const state = advance(newSession(), 3).session;
    const doc = save(state);
    const loaded = load(content, doc);
    expect(loaded.ok).toBe(true);
    if (loaded.ok) {
      expect(loaded.value.world.tick).toBe(3);
      expect(loaded.value.revision).toBe(3);
    }
  });

  it('[TDS-19.1] a mismatched checksum is rejected', () => {
    const state = newSession();
    const doc = save(state);
    const mismatched = { ...content, checksum: 'other' };
    const loaded = load(mismatched, doc);
    expect(loaded.ok).toBe(false);
    if (!loaded.ok) expect(loaded.error[0]?.code).toBe('content_mismatch');
  });
});

describe('[SCN-13] save-continue determinism', () => {
  it('[SCN-13] a save-continue run matches an uninterrupted run', () => {
    const continuous = advance(newSession(), 6).session;

    const interrupted = advance(newSession(), 3).session;
    const doc = save(interrupted);
    const loaded = load(content, doc);
    if (!loaded.ok) throw new Error('load failed');
    const continued = advance(loaded.value, 3).session;

    expect(hashWorld(continued.world, registry)).toBe(hashWorld(continuous.world, registry));
  });
});
