/**
 * The provisional window host (design D3). It re-hosts the views that used to
 * live in the dashboard drawers as floating panels opened from the action bar,
 * so the client stays fully usable until 11.4e replaces them with the 07 §12.4
 * window set. Escape closes the topmost window.
 *
 * Source: REF-12.4, REF-14.1
 */
import { h } from '../../dom/h.js';

/** One hosted window. */
export interface HostedWindow {
  readonly kind: string;
  readonly title: string;
  readonly el: HTMLElement;
}

/** A mounted window host. */
export interface WindowHost {
  readonly el: HTMLElement;
  register(window: HostedWindow): void;
  toggle(kind: string): void;
  open(kind: string): void;
  close(kind: string): void;
  closeTop(): void;
  /** The kinds currently open, in open order (for tests and shortcuts). */
  openKinds(): readonly string[];
}

/**
 * Creates the window host (design D3, REF-12.4). At most `cap` windows are open
 * at once; opening beyond the cap closes the oldest, and Escape closes the most
 * recent.
 *
 * Source: REF-12.4, REF-16
 */
export function createWindowHost(cap = 2): WindowHost {
  const el = h('div', {
    class: 'hud-windows-host',
    'data-testid': 'window-host',
    role: 'region',
    'aria-label': 'Windows',
  });
  const windows = new Map<string, HostedWindow>();
  const panels = new Map<string, HTMLElement>();
  let open: string[] = [];

  const render = (): void => {
    for (const [kind, panel] of panels) panel.hidden = !open.includes(kind);
  };

  const openWindow = (kind: string): void => {
    if (!windows.has(kind)) return;
    if (!open.includes(kind)) open = [...open, kind];
    while (open.length > Math.max(1, cap)) open = open.slice(1);
    render();
  };

  return {
    el,
    register(window) {
      windows.set(window.kind, window);
      const close = h('button', {
        class: 'hud-window-close',
        'data-testid': `window-close-${window.kind}`,
        text: '×',
        onclick: () => {
          open = open.filter((entry) => entry !== window.kind);
          render();
        },
      });
      const panel = h(
        'section',
        {
          class: 'hud-window',
          'data-testid': `window-${window.kind}`,
          'aria-label': window.title,
          hidden: true,
        },
        h(
          'header',
          { class: 'hud-window-header' },
          h('span', { class: 'hud-window-title', text: window.title }),
          close,
        ),
        window.el,
      );
      panels.set(window.kind, panel);
      el.append(panel);
      render();
    },
    toggle(kind) {
      if (open.includes(kind)) {
        open = open.filter((entry) => entry !== kind);
        render();
        return;
      }
      openWindow(kind);
    },
    open: openWindow,
    close(kind) {
      open = open.filter((entry) => entry !== kind);
      render();
    },
    closeTop() {
      const last = open.at(-1);
      if (last === undefined) return;
      open = open.slice(0, -1);
      render();
    },
    openKinds: () => [...open],
  };
}
