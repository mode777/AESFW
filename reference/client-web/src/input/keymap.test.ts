/**
 * The keyboard map and the command palette (REF-13.2, REF-13.4).
 *
 * Source: REF-13.2, REF-13.4
 */
import { describe, expect, it } from 'vitest';

import { keyAction } from './keymap.js';
import { PALETTE_COMMANDS, paletteMatches } from '../selectors/palette.js';

const key = (value: string, overrides: Record<string, boolean> = {}) => ({
  key: value,
  ...overrides,
});

describe('[REF-13.2] keyboard map', () => {
  it('[REF-13.2] simulation keys work in every mode', () => {
    for (const mode of ['inspect', 'place', 'demolish', 'route-edit'] as const) {
      expect(keyAction(key(' '), mode)).toEqual({ kind: 'pause' });
      expect(keyAction(key('3'), mode)).toEqual({ kind: 'speed', speed: 3 });
      expect(keyAction(key('.'), mode)).toEqual({ kind: 'step' });
    }
  });

  it('[REF-13.2] B, X, R, and Escape respect the mode', () => {
    expect(keyAction(key('b'), 'inspect')).toEqual({ kind: 'build' });
    expect(keyAction(key('x'), 'inspect')).toEqual({ kind: 'demolish' });
    expect(keyAction(key('r'), 'place')).toEqual({ kind: 'rotate' });
    expect(keyAction(key('r'), 'inspect')).toEqual({ kind: 'none' });
    expect(keyAction(key('Escape'), 'place')).toEqual({ kind: 'cancel' });
  });

  it('[REF-13.2] E toggles the selected entity outside place mode', () => {
    expect(keyAction(key('e'), 'inspect')).toEqual({ kind: 'toggle-entity' });
    expect(keyAction(key('E'), 'inspect')).toEqual({ kind: 'toggle-entity' });
    expect(keyAction(key('e'), 'place')).toEqual({ kind: 'none' });
  });

  it('[REF-13.2] arrows pan and Shift+arrows move the grid cursor', () => {
    expect(keyAction(key('ArrowUp'), 'inspect')).toEqual({ kind: 'pan', dx: 0, dy: -1 });
    expect(keyAction(key('ArrowLeft', { shiftKey: true }), 'inspect')).toEqual({
      kind: 'cursor',
      dx: -1,
      dy: 0,
    });
  });

  it('[REF-13.2] zoom, Home, overlays, the palette, and windows', () => {
    expect(keyAction(key('+'), 'inspect')).toEqual({ kind: 'zoom', factor: 1.25 });
    expect(keyAction(key('Home'), 'inspect')).toEqual({ kind: 'home' });
    expect(keyAction(key('c'), 'inspect')).toEqual({ kind: 'overlay', key: 'c' });
    expect(keyAction(key('k', { ctrlKey: true }), 'inspect')).toEqual({ kind: 'palette' });
    expect(keyAction(key('e', { altKey: true }), 'inspect')).toEqual({
      kind: 'window',
      id: 'statistics',
    });
    expect(keyAction(key('t'), 'inspect')).toEqual({ kind: 'overlay', key: 't' });
    expect(keyAction(key('t', { altKey: true }), 'inspect')).toEqual({
      kind: 'window',
      id: 'tables',
    });
  });

  it('[REF-13.2] unknown keys do nothing', () => {
    expect(keyAction(key('q'), 'inspect')).toEqual({ kind: 'none' });
  });
});

describe('[REF-13.4] command palette', () => {
  it('[REF-13.4] an empty query lists every command', () => {
    expect(paletteMatches('')).toHaveLength(PALETTE_COMMANDS.length);
  });

  it('[REF-13.4] the filter matches labels and keywords, case-insensitively', () => {
    expect(paletteMatches('PLANN').map((entry) => entry.id)).toEqual(['window.planning']);
    expect(paletteMatches('throttle').map((entry) => entry.id)).toEqual(['overlay.throughput']);
    expect(paletteMatches('zzz')).toEqual([]);
  });
});
