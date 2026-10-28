/**
 * Client-local persistence (REF-14.5, PIC-16). View settings live in
 * `localStorage` under one versioned key; discarding them never affects the
 * session, so no migration code carries `v1` forward.
 *
 * Source: REF-14.5, PIC-16
 */

/** The storage key of the reference client (07 §14.5). */
export const STORAGE_KEY = 'aesfw-ref.client.v2';

/** The client-local settings this row persists (REF-14.5). */
export interface ClientSettings {
  /** Camera centre and zoom at the world level (11.4b owns the behaviour). */
  readonly camera: { readonly x: number; readonly y: number; readonly zoom: number };
  /** Pinned resource IDs, in pin order. */
  readonly pins: readonly string[];
  /** Open windows, in open order. */
  readonly windows: readonly string[];
  readonly locale: string;
  readonly theme: 'light' | 'dark';
  /** The last viewed location, so a reload returns to it. */
  readonly location: number | null;
}

/** The defaults of a fresh client (REF-14.5). */
export const DEFAULT_CLIENT_SETTINGS: ClientSettings = {
  camera: { x: 0, y: 0, zoom: 1 },
  pins: [],
  windows: [],
  locale: 'en',
  theme: 'light',
  location: null,
};

/** The storage surface, so tests can supply a fake (REF-14.5). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const asArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/**
 * Parses stored settings, falling back to defaults for anything missing or
 * malformed: a partially written or hand-edited value must never break the
 * client (PIC-16).
 *
 * Source: REF-14.5
 */
export function parseClientSettings(raw: string | null): ClientSettings {
  if (raw === null) return DEFAULT_CLIENT_SETTINGS;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_CLIENT_SETTINGS;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return DEFAULT_CLIENT_SETTINGS;
  }
  const record = parsed as Record<string, unknown>;
  const camera =
    record['camera'] !== null && typeof record['camera'] === 'object'
      ? (record['camera'] as Record<string, unknown>)
      : {};
  const number = (value: unknown, fallback: number): number =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return {
    camera: {
      x: number(camera['x'], 0),
      y: number(camera['y'], 0),
      zoom: number(camera['zoom'], 1),
    },
    pins: asArray(record['pins']),
    windows: asArray(record['windows']),
    locale: typeof record['locale'] === 'string' ? record['locale'] : 'en',
    theme: record['theme'] === 'dark' ? 'dark' : 'light',
    location:
      typeof record['location'] === 'number' && Number.isFinite(record['location'])
        ? record['location']
        : null,
  };
}

/** The browser storage, or `null` when unavailable (node, private mode). */
const defaultStorage = (): StorageLike | null => {
  try {
    const candidate = (globalThis as { localStorage?: StorageLike }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
};

/** Reads the client's settings (REF-14.5). */
export function readClientSettings(storage: StorageLike | null = defaultStorage()): ClientSettings {
  if (storage === null) return DEFAULT_CLIENT_SETTINGS;
  try {
    return parseClientSettings(storage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_CLIENT_SETTINGS;
  }
}

/**
 * Writes the client's settings (REF-14.5). A storage failure is ignored: view
 * settings are disposable and never block the game (PIC-16).
 *
 * Source: REF-14.5
 */
export function writeClientSettings(
  settings: ClientSettings,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (storage === null) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Disposable: a full or blocked storage must not break the client.
  }
}
