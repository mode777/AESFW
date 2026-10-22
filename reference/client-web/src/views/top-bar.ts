/**
 * The top bar (REF-11): tick, speed, run/pause/step, and blocked count. It
 * issues `control` commands through the session client and renders from the
 * mirror.
 *
 * Source: REF-11, REF-13.2
 */
import type { SessionClient } from '@aesfw/host-web/client';
import { h } from '../dom/h.js';
import type { Mirror } from '../store/mirror.js';
import type { ViewState } from '../store/view-state.js';

const SPEEDS = [1, 2, 4, 8, 16];

/** A mounted top bar. */
export interface TopBar {
  readonly el: HTMLElement;
  update(): void;
}

/**
 * Creates the top bar (REF-11).
 *
 * Source: REF-11
 */
export function createTopBar(client: SessionClient, mirror: Mirror, view: ViewState): TopBar {
  const tick = h('span', { class: 'tick', 'data-testid': 'topbar-tick', text: 'tick 0' });
  const speed = h('span', { class: 'speed', 'data-testid': 'topbar-speed', text: '×1' });
  const blocked = h('span', {
    class: 'blocked',
    'data-testid': 'topbar-blocked',
    text: '0 blocked',
  });
  const play = h('button', {
    'data-testid': 'topbar-play',
    text: '▷',
    onclick: () => client.control('run'),
  });
  const pause = h('button', {
    'data-testid': 'topbar-pause',
    text: '‖',
    onclick: () => client.control('pause'),
  });
  const step = h('button', {
    'data-testid': 'topbar-step',
    text: '▷▷',
    onclick: () => client.control('step', { ticks: 1 }),
  });
  const speedUp = h('button', {
    'data-testid': 'topbar-speed-up',
    text: '×',
    onclick: () => {
      const current = Number(speed.dataset['speed'] ?? '1');
      const next = SPEEDS[Math.min(SPEEDS.indexOf(current) + 1, SPEEDS.length - 1)] ?? 1;
      speed.dataset['speed'] = String(next);
      client.control('speed', { speed: next });
      update();
    },
  });
  const el = h(
    'header',
    { class: 'top-bar', 'data-testid': 'top-bar' },
    h('span', { class: 'brand', text: 'TIER' }),
    tick,
    speed,
    h('span', { class: 'controls' }, play, pause, step, speedUp),
    blocked,
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
    void view;
  };

  mirror.projection.subscribe(update);
  update();
  return { el, update };
}
