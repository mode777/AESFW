/**
 * Client-local persistence (REF-14.5, PIC-16).
 *
 * Source: REF-14.5, PIC-16
 */
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_CLIENT_SETTINGS,
  STORAGE_KEY,
  parseClientSettings,
  readClientSettings,
  writeClientSettings,
} from './storage.js';
import type { StorageLike } from './storage.js';

const memoryStorage = (
  initial: Record<string, string> = {},
): StorageLike & {
  readonly values: Record<string, string>;
} => {
  const values = { ...initial };
  return {
    values,
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => {
      values[key] = value;
    },
  };
};

describe('[REF-14.5] client-local persistence', () => {
  it('[REF-14.5] settings round-trip under the versioned key', () => {
    const storage = memoryStorage();
    const settings = {
      camera: { x: 4, y: -2, zoom: 2 },
      pins: ['ref.tier.resource.h1'],
      windows: ['economy'],
      locale: 'en',
      theme: 'dark' as const,
      location: 3,
    };
    writeClientSettings(settings, storage);
    expect(storage.values[STORAGE_KEY]).toBeDefined();
    expect(readClientSettings(storage)).toEqual(settings);
  });

  it('[REF-14.5] the v1 key is ignored, not migrated', () => {
    const storage = memoryStorage({
      'aesfw-ref.client.v1': JSON.stringify({ drawer: 'economy' }),
    });
    expect(readClientSettings(storage)).toEqual(DEFAULT_CLIENT_SETTINGS);
  });

  it('[REF-14.5] malformed or partial values fall back to defaults', () => {
    expect(parseClientSettings('not json')).toEqual(DEFAULT_CLIENT_SETTINGS);
    expect(parseClientSettings('null')).toEqual(DEFAULT_CLIENT_SETTINGS);
    expect(parseClientSettings('{"pins":["a",2],"theme":"neon"}')).toEqual({
      ...DEFAULT_CLIENT_SETTINGS,
      pins: ['a'],
    });
  });

  it('[PIC-16] a storage failure never breaks the client', () => {
    const failing: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readClientSettings(failing)).toEqual(DEFAULT_CLIENT_SETTINGS);
    expect(() => writeClientSettings(DEFAULT_CLIENT_SETTINGS, failing)).not.toThrow();
    expect(readClientSettings(null)).toEqual(DEFAULT_CLIENT_SETTINGS);
  });
});
