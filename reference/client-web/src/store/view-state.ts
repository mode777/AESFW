/**
 * Client-local view state (REF-14.1, PIC-16). Kept separate from the
 * authoritative mirror; discarding it never affects the session.
 *
 * Source: REF-14.1, PIC-16
 */
import type { PlacementResultDto } from '@aesfw/protocol';
import { signal } from './signals.js';
import type { Signal } from './signals.js';

/** The interaction modes of REF-13.1. */
export type ClientMode = 'inspect' | 'place' | 'route-edit';

/** The grid overlays of REF-12.2. */
export type GridOverlay = 'connectivity' | 'suitability' | 'throughput' | 'coverage' | null;

/** The placement ghost cursor and its latest authoritative result (REF-13.3). */
export interface PlacementCursor {
  readonly definitionId: string | null;
  readonly position: readonly [number, number];
  readonly orientation: number;
  readonly result: PlacementResultDto | null;
}

/** The camera of the world area (REF-14.3; behaviour lands in 11.4b). */
export interface Camera {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

/** The colour themes of REF-10.1 (the dark theme lands in 11.4). */
export type Theme = 'light' | 'dark';

/** Client-local view state (REF-14.1). */
export interface ViewState {
  readonly selection: Signal<number | null>;
  readonly location: Signal<number | null>;
  readonly mode: Signal<ClientMode>;
  readonly placement: Signal<PlacementCursor>;
  readonly locale: Signal<string>;
  readonly overlay: Signal<GridOverlay>;
  readonly drawer: Signal<string | null>;
  readonly debug: Signal<boolean>;
  readonly worldMap: Signal<boolean>;
  /** Pinned resource IDs of the resource bar, in pin order (REF-11). */
  readonly pins: Signal<readonly string[]>;
  /** Open windows, in open order (REF-12.4). */
  readonly windows: Signal<readonly string[]>;
  /** The world-area camera (REF-14.3). */
  readonly camera: Signal<Camera>;
  /** The colour theme (REF-10.1). */
  readonly theme: Signal<Theme>;
}

/**
 * Toggles a pin in the resource bar, keeping pin order (REF-11).
 *
 * Source: REF-11
 */
export function togglePin(current: readonly string[], resourceId: string): readonly string[] {
  return current.includes(resourceId)
    ? current.filter((entry) => entry !== resourceId)
    : [...current, resourceId];
}

/**
 * Toggles a grid overlay from an overlay key (REF-12.2, REF-13.2): `C` selects
 * connectivity, `S` selects suitability, `T` selects throughput, and re-pressing the active key clears
 * it. Other keys leave the overlay unchanged.
 *
 * Source: REF-12.2, REF-13.2
 */
export function toggleOverlay(current: GridOverlay, key: string): GridOverlay {
  const normalized = key.toLowerCase();
  if (normalized === 'c') return current === 'connectivity' ? null : 'connectivity';
  if (normalized === 's') return current === 'suitability' ? null : 'suitability';
  if (normalized === 't') return current === 'throughput' ? null : 'throughput';
  if (normalized === 'o') return current === 'coverage' ? null : 'coverage';
  return current;
}

/**
 * Maps an interaction key to the next mode (REF-13.1, REF-13.2): `B` enters
 * place mode, `Escape` returns to inspect mode, and any other key leaves the
 * mode unchanged.
 *
 * Source: REF-13.1, REF-13.2
 */
export function nextMode(current: ClientMode, key: string): ClientMode {
  if (key === 'b' || key === 'B') return 'place';
  if (key === 'Escape') return 'inspect';
  return current;
}

/**
 * Toggles a drawer from a key (REF-13.4): `E` selects the economy drawer, `P`
 * the planning drawer, and re-pressing the active drawer's key closes it.
 * Other keys leave the drawer unchanged.
 *
 * Source: REF-13.4
 */
export function drawerAction(current: string | null, key: string): string | null {
  const normalized = key.toLowerCase();
  if (normalized === 'e') return current === 'economy' ? null : 'economy';
  if (normalized === 'p') return current === 'planning' ? null : 'planning';
  if (normalized === 'l') return current === 'logistics' ? null : 'logistics';
  if (normalized === 'v') return current === 'population' ? null : 'population';
  if (normalized === 'x') return current === 'exchange' ? null : 'exchange';
  return current;
}

/**
 * Creates the client-local view state (REF-14.1).
 *
 * Source: REF-14.1
 */
export function createViewState(): ViewState {
  return {
    selection: signal<number | null>(null),
    location: signal<number | null>(null),
    mode: signal<ClientMode>('inspect'),
    placement: signal<PlacementCursor>({
      definitionId: null,
      position: [0, 0],
      orientation: 0,
      result: null,
    }),
    locale: signal('en'),
    overlay: signal<GridOverlay>(null),
    drawer: signal<string | null>(null),
    debug: signal(false),
    worldMap: signal(false),
    pins: signal<readonly string[]>([]),
    windows: signal<readonly string[]>([]),
    camera: signal<Camera>({ x: 0, y: 0, zoom: 1 }),
    theme: signal<Theme>('light'),
  };
}
