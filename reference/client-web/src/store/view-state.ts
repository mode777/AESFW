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

/** Client-local view state (REF-14.1). */
export interface ViewState {
  readonly selection: Signal<number | null>;
  readonly mode: Signal<ClientMode>;
  readonly locale: Signal<string>;
  readonly overlay: Signal<string | null>;
  readonly drawer: Signal<string | null>;
  readonly debug: Signal<boolean>;
}

/**
 * Creates the client-local view state (REF-14.1).
 *
 * Source: REF-14.1
 */
export function createViewState(): ViewState {
  return {
    selection: signal<number | null>(null),
    mode: signal<ClientMode>('inspect'),
    locale: signal('en'),
    overlay: signal<string | null>(null),
    drawer: signal<string | null>(null),
    debug: signal(false),
  };
}
