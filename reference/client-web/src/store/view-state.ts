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
export type GridOverlay = 'connectivity' | 'suitability' | null;

/** The placement ghost cursor and its latest authoritative result (REF-13.3). */
export interface PlacementCursor {
  readonly definitionId: string | null;
  readonly position: readonly [number, number];
  readonly orientation: number;
  readonly result: PlacementResultDto | null;
}

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
}

/**
 * Toggles a grid overlay from an overlay key (REF-12.2, REF-13.2): `C` selects
 * connectivity, `S` selects suitability, and re-pressing the active key clears
 * it. Other keys leave the overlay unchanged.
 *
 * Source: REF-12.2, REF-13.2
 */
export function toggleOverlay(current: GridOverlay, key: string): GridOverlay {
  const normalized = key.toLowerCase();
  if (normalized === 'c') return current === 'connectivity' ? null : 'connectivity';
  if (normalized === 's') return current === 'suitability' ? null : 'suitability';
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
  };
}
