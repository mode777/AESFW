/**
 * The debug overlay (REF-12.5). Shows tick, revision, last state hash, protocol
 * version, and content checksum; toggled with the backtick key.
 *
 * Source: REF-12.5
 */
import { h } from '../dom/h.js';
import type { Mirror } from '../store/mirror.js';
import type { ViewState } from '../store/view-state.js';

/** Static values the overlay reports. */
export interface DebugMetadata {
  readonly protocolVersion: number;
  readonly checksum: string;
  readonly lastHash: string;
}

/** A mounted debug overlay. */
export interface DebugOverlay {
  readonly el: HTMLElement;
  update(): void;
}

/**
 * Creates the debug overlay (REF-12.5).
 *
 * Source: REF-12.5
 */
export function createDebugOverlay(
  mirror: Mirror,
  view: ViewState,
  metadata: DebugMetadata,
): DebugOverlay {
  const el = h('pre', { class: 'debug-overlay', 'data-testid': 'debug-overlay' });
  const update = (): void => {
    const projection = mirror.projection();
    el.textContent = [
      `tick ${projection?.tick ?? 0}`,
      `revision ${projection?.revision ?? 0}`,
      `hash ${metadata.lastHash}`,
      `protocol ${metadata.protocolVersion}`,
      `checksum ${metadata.checksum}`,
    ].join('\n');
    el.hidden = !view.debug();
  };
  view.debug.subscribe(update);
  mirror.projection.subscribe(update);
  update();
  return { el, update };
}
