/**
 * Client-local view state (REF-14.1, PIC-16). Kept separate from the
 * authoritative mirror; discarding it never affects the session.
 *
 * Source: REF-14.1, PIC-16
 */
import { signal } from './signals.js';
import type { Signal } from './signals.js';

/** The interaction modes of REF-13.1. */
export type ClientMode = 'inspect' | 'place' | 'route-edit';

/** The grid overlays of REF-12.2. */
export type GridOverlay = 'connectivity' | 'suitability' | null;

/** Client-local view state (REF-14.1). */
export interface ViewState {
  readonly selection: Signal<number | null>;
  readonly location: Signal<number | null>;
  readonly mode: Signal<ClientMode>;
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
 * Creates the client-local view state (REF-14.1).
 *
 * Source: REF-14.1
 */
export function createViewState(): ViewState {
  return {
    selection: signal<number | null>(null),
    location: signal<number | null>(null),
    mode: signal<ClientMode>('inspect'),
    locale: signal('en'),
    overlay: signal<GridOverlay>(null),
    drawer: signal<string | null>(null),
    debug: signal(false),
  };
}
