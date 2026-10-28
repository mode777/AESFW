/**
 * The complete keyboard map (REF-13.2). Pure: `keyAction` maps a key (with its
 * modifiers) and the current mode to one action, so every binding is
 * unit-tested without a DOM.
 *
 * Source: REF-13.2, REF-13.4
 */
import type { ClientMode } from '../store/view-state.js';

/** A resolved keyboard action (REF-13.2). */
export type KeyAction =
  | { readonly kind: 'pause' }
  | { readonly kind: 'speed'; readonly speed: number }
  | { readonly kind: 'step' }
  | { readonly kind: 'build' }
  | { readonly kind: 'demolish' }
  | { readonly kind: 'inspect' }
  | { readonly kind: 'rotate' }
  | { readonly kind: 'toggle-entity' }
  | { readonly kind: 'pan'; readonly dx: number; readonly dy: number }
  | { readonly kind: 'cursor'; readonly dx: number; readonly dy: number }
  | { readonly kind: 'zoom'; readonly factor: number }
  | { readonly kind: 'home' }
  | { readonly kind: 'confirm' }
  | { readonly kind: 'cancel' }
  | { readonly kind: 'overlay'; readonly key: string }
  | { readonly kind: 'palette' }
  | { readonly kind: 'window'; readonly id: string }
  | { readonly kind: 'debug' }
  | { readonly kind: 'none' };

/** A keyboard event reduced to what the map reads. */
export interface KeyEventLike {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly altKey?: boolean;
}

const WINDOW_KEYS: Readonly<Record<string, string>> = {
  e: 'statistics',
  p: 'planning',
  l: 'routes',
  y: 'exchange',
  g: 'log',
  t: 'tables',
};

const SPEED_KEYS = ['1', '2', '3', '4', '5'];

/**
 * Resolves a key event (REF-13.2). Modifiers win over plain keys: `Ctrl+K`
 * opens the palette, `Alt+<letter>` toggles a window, `Shift+Arrow` moves the
 * grid cursor and a plain arrow pans the camera.
 *
 * Source: REF-13.2
 */
export function keyAction(event: KeyEventLike, mode: ClientMode): KeyAction {
  const key = event.key;
  if ((event.ctrlKey === true || event.metaKey === true) && key.toLowerCase() === 'k') {
    return { kind: 'palette' };
  }
  if (event.altKey === true) {
    const window = WINDOW_KEYS[key.toLowerCase()];
    return window === undefined ? { kind: 'none' } : { kind: 'window', id: window };
  }
  if (key === ' ' || key === 'Spacebar') return { kind: 'pause' };
  if (SPEED_KEYS.includes(key)) return { kind: 'speed', speed: Number(key) };
  if (key === '.') return { kind: 'step' };
  if (key === '`') return { kind: 'debug' };
  if (key === 'Home') return { kind: 'home' };
  if (key === '+' || key === '=') return { kind: 'zoom', factor: 1.25 };
  if (key === '-' || key === '_') return { kind: 'zoom', factor: 1 / 1.25 };
  if (key === 'Tab') return { kind: 'none' };
  const lower = key.toLowerCase();
  if (lower === 'b') return { kind: 'build' };
  if (lower === 'x') return { kind: 'demolish' };
  if (lower === 'r' && mode === 'place') return { kind: 'rotate' };
  if (lower === 'e' && mode !== 'place') return { kind: 'toggle-entity' };
  if (['c', 'v', 's', 't', 'o'].includes(lower)) return { kind: 'overlay', key: lower };
  if (key === 'Enter') return { kind: 'confirm' };
  if (key === 'Escape') return { kind: 'cancel' };
  const arrows: Readonly<Record<string, { readonly dx: number; readonly dy: number }>> = {
    ArrowUp: { dx: 0, dy: -1 },
    ArrowDown: { dx: 0, dy: 1 },
    ArrowLeft: { dx: -1, dy: 0 },
    ArrowRight: { dx: 1, dy: 0 },
  };
  const arrow = arrows[key];
  if (arrow !== undefined) {
    return event.shiftKey === true
      ? { kind: 'cursor', dx: arrow.dx, dy: arrow.dy }
      : { kind: 'pan', dx: arrow.dx, dy: arrow.dy };
  }
  return { kind: 'none' };
}

/** The keys the help line lists (REF-13.2). */
export const KEY_HINTS: readonly { readonly keys: string; readonly action: string }[] = [
  { keys: 'Space', action: 'pause or resume' },
  { keys: '1–5', action: 'speed' },
  { keys: '.', action: 'step' },
  { keys: 'B / X / Esc', action: 'build / demolish / inspect' },
  { keys: 'R', action: 'rotate ghost' },
  { keys: 'E', action: 'toggle selected entity' },
  { keys: 'Arrows / Shift+Arrows', action: 'pan / grid cursor' },
  { keys: '+ / −', action: 'zoom' },
  { keys: 'Home', action: 'recentre' },
  { keys: 'C V S T', action: 'overlays' },
  { keys: 'Ctrl+K', action: 'command palette' },
  { keys: 'Alt+E P L Y G T', action: 'windows' },
];
