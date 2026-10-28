/**
 * The action bar (REF-11): simulation controls, tick and blocked count, window
 * toggles, save/load, table mode, and the debug overlay. Every mutation goes
 * through the session client as a named command (07 §9 principle 5).
 *
 * Source: REF-11, REF-13.2, REF-13.4
 */
import type { SessionClient } from '@aesfw/host-web/client';
import { h } from '../../dom/h.js';
import type { Mirror } from '../../store/mirror.js';
import type { ViewState } from '../../store/view-state.js';

/** The windows the action bar toggles (REF-12.4). */
export type WindowKind = 'statistics' | 'planning' | 'routes' | 'exchange' | 'log' | 'tables';

/**
 * The window keys (REF-12.4, design D5). `X` is demolish per REF-13.2, so the
 * exchange window uses `Y` until 11.4 normalizes the full key map.
 */
export const WINDOW_KEYS: Readonly<Record<WindowKind, string>> = {
  statistics: 'e',
  planning: 'p',
  routes: 'l',
  exchange: 'y',
  log: 'g',
  tables: 't',
};

/** A mounted action bar. */
export interface ActionBar {
  readonly el: HTMLElement;
  update(): void;
}

const SPEEDS = [1, 2, 4, 8, 16];

/** Creates the action bar (REF-11). */
export function createActionBar(
  client: SessionClient,
  mirror: Mirror,
  view: ViewState,
  toggleWindow: (kind: WindowKind) => void,
): ActionBar {
  const tick = h('span', { class: 'hud-tick', 'data-testid': 'action-tick', text: 'tick 0' });
  const blocked = h('span', {
    class: 'hud-blocked',
    'data-testid': 'action-blocked',
    text: '0 blocked',
  });
  const speed = h('span', { class: 'hud-speed', 'data-testid': 'action-speed', text: '×1' });
  const play = h('button', {
    'data-testid': 'action-play',
    title: 'run',
    text: '▷',
    onclick: () => client.control('run'),
  });
  const pause = h('button', {
    'data-testid': 'action-pause',
    title: 'pause',
    text: '‖',
    onclick: () => client.control('pause'),
  });
  const step = h('button', {
    'data-testid': 'action-step',
    title: 'step one tick',
    text: '▷▷',
    onclick: () => client.control('step', { ticks: 1 }),
  });
  const faster = h('button', {
    'data-testid': 'action-speed-up',
    title: 'faster',
    text: '×',
    onclick: () => {
      const current = Number(speed.dataset['speed'] ?? '1');
      const next = SPEEDS[Math.min(SPEEDS.indexOf(current) + 1, SPEEDS.length - 1)] ?? 1;
      speed.dataset['speed'] = String(next);
      client.control('speed', { speed: next });
      update();
    },
  });
  const save = h('button', {
    'data-testid': 'action-save',
    text: 'save',
    onclick: () => client.save('auto'),
  });
  const load = h('button', {
    'data-testid': 'action-load',
    text: 'load',
    onclick: () => client.load('auto'),
  });
  const windowButton = (kind: WindowKind, label: string): HTMLElement =>
    h('button', {
      'data-testid': `action-window-${kind}`,
      text: label,
      onclick: () => toggleWindow(kind),
    });
  const tables = h('button', {
    'data-testid': 'action-tables',
    title: 'table mode',
    text: 'tables',
    onclick: () => toggleWindow('tables'),
  });
  const debug = h('button', {
    'data-testid': 'action-debug',
    title: 'debug overlay (`)',
    text: 'debug',
    onclick: () => view.debug.set(!view.debug()),
  });
  const theme = h('button', {
    'data-testid': 'action-theme',
    title: 'theme',
    text: 'theme',
    onclick: () => {
      const next = view.theme() === 'dark' ? 'light' : 'dark';
      view.theme.set(next);
      document.documentElement.dataset['theme'] = next;
    },
  });
  const palette = h('button', {
    'data-testid': 'action-palette',
    title: 'command palette (Ctrl+K)',
    text: 'commands',
    onclick: () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    },
  });

  const el = h(
    'div',
    { class: 'hud-action-bar-inner' },
    h('span', { class: 'hud-controls' }, play, pause, step, faster, speed),
    tick,
    blocked,
    h(
      'span',
      { class: 'hud-windows' },
      windowButton('statistics', 'E'),
      windowButton('planning', 'P'),
      windowButton('routes', 'L'),
      windowButton('exchange', 'Y'),
      windowButton('log', 'G'),
      tables,
    ),
    h('span', { class: 'hud-system' }, save, load, palette, theme, debug),
  );

  const update = (): void => {
    const projection = mirror.projection();
    tick.textContent = `tick ${projection?.tick ?? 0}`;
    speed.textContent = `×${Number(speed.dataset['speed'] ?? '1')}`;
    const entities = projection?.entities ?? [];
    const blockedCount = entities.filter(
      (entity) => (entity.production?.block_reasons.length ?? 0) > 0,
    ).length;
    blocked.textContent = `${blockedCount} blocked`;
  };

  mirror.projection.subscribe(update);
  update();
  return { el, update };
}
