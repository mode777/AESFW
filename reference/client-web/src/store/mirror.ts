/**
 * The authoritative mirror (REF-14.2, PIC-18). Applies deltas only to the
 * matching base revision and requests a full snapshot on mismatch. It is never
 * patched by client-computed values.
 *
 * Source: REF-14.2, PIC-18
 */
import { applyDelta as applyDeltaToSnapshot, canApplyDelta } from '@aesfw/protocol';
import type { EventDto, SnapshotDeltaDto, SnapshotDto } from '@aesfw/protocol';
import { signal } from './signals.js';
import type { Signal } from './signals.js';

/** Callbacks the mirror needs from its host. */
export interface MirrorDeps {
  readonly requestSnapshot: () => void;
}

/** The authoritative mirror (REF-14.2). */
export interface Mirror {
  readonly projection: Signal<SnapshotDto | null>;
  readonly events: Signal<readonly EventDto[]>;
  applySnapshot(snapshot: SnapshotDto): void;
  applyDelta(delta: SnapshotDeltaDto, events: readonly EventDto[]): void;
}

/**
 * Creates the mirror (REF-14.2).
 *
 * Source: REF-14.2, PIC-18
 */
export function createMirror(deps: MirrorDeps): Mirror {
  const projection = signal<SnapshotDto | null>(null);
  const events = signal<readonly EventDto[]>([]);
  return {
    projection,
    events,
    applySnapshot(snapshot) {
      projection.set(snapshot);
      events.set([]);
    },
    applyDelta(delta, incoming) {
      const current = projection();
      if (current === null || !canApplyDelta(current, delta)) {
        deps.requestSnapshot();
        return;
      }
      // Performance marks for the tick budget (REF-14.6); the Playwright
      // scenario reads them from the performance timeline.
      const marked = typeof performance !== 'undefined' && typeof performance.mark === 'function';
      if (marked) performance.mark('aesfw:merge-start');
      const merged = applyDeltaToSnapshot(current, delta);
      if (marked) {
        performance.mark('aesfw:merge-end');
        performance.measure('aesfw:merge', 'aesfw:merge-start', 'aesfw:merge-end');
      }
      if (marked) performance.mark('aesfw:delta-start');
      projection.set(merged);
      events.set([...events(), ...incoming]);
      if (marked) {
        performance.mark('aesfw:delta-end');
        performance.measure('aesfw:delta', 'aesfw:delta-start', 'aesfw:delta-end');
      }
    },
  };
}
