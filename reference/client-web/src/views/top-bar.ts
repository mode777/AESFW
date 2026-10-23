/**
 * The top bar (REF-11): tick, speed, run/pause/step, and blocked count. It
 * issues `control` commands through the session client and renders from the
 * mirror.
 *
 * Source: REF-11, REF-13.2
 */
import type { SessionClient } from '@aesfw/host-web/client';
import { h } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import { CREDITS_RESOURCE_ID, REFERENCE_BASE_SCALE } from '../selectors/economy.js';
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
export function createTopBar(
  client: SessionClient,
  mirror: Mirror,
  view: ViewState,
  i18n: I18n,
  toggleDrawer: (kind: 'economy' | 'planning') => void,
): TopBar {
  const tick = h('span', { class: 'tick', 'data-testid': 'topbar-tick', text: 'tick 0' });
  const credits = h('span', {
    class: 'credits',
    'data-testid': 'topbar-credits',
    text: `${i18n.t('economy.credits')} 0`,
  });
  const speed = h('span', { class: 'speed', 'data-testid': 'topbar-speed', text: '×1' });
  const mode = h('span', { class: 'mode', 'data-testid': 'topbar-mode', text: 'inspect' });
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
  const save = h('button', {
    'data-testid': 'topbar-save',
    text: 'save',
    onclick: () => client.save('auto'),
  });
  const load = h('button', {
    'data-testid': 'topbar-load',
    text: 'load',
    onclick: () => client.load('auto'),
  });
  const economy = h('button', {
    'data-testid': 'topbar-economy',
    text: i18n.t('economy.title'),
    onclick: () => toggleDrawer('economy'),
  });
  const planning = h('button', {
    'data-testid': 'topbar-planning',
    text: i18n.t('planning.title'),
    onclick: () => toggleDrawer('planning'),
  });
  const el = h(
    'header',
    { class: 'top-bar', 'data-testid': 'top-bar' },
    h('span', { class: 'brand', text: 'TIER' }),
    tick,
    speed,
    mode,
    h('span', { class: 'controls' }, play, pause, step, speedUp, save, load, economy, planning),
    credits,
    blocked,
  );

  const update = (): void => {
    const projection = mirror.projection();
    tick.textContent = `tick ${projection?.tick ?? 0}`;
    speed.textContent = `×${Number(speed.dataset['speed'] ?? '1')}`;
    mode.textContent = view.mode();
    const owner = projection?.owners[0];
    const balance = owner?.resources[CREDITS_RESOURCE_ID];
    credits.textContent = `${i18n.t('economy.credits')} ${
      balance === undefined ? '-' : i18n.formatBaseUnits(balance, REFERENCE_BASE_SCALE)
    }`;
    const entities = projection?.entities ?? [];
    const blockedCount = entities.filter(
      (entity) => (entity.production?.block_reasons.length ?? 0) > 0,
    ).length;
    blocked.textContent = `${blockedCount} blocked`;
  };

  mirror.projection.subscribe(update);
  view.mode.subscribe(update);
  update();
  return { el, update };
}
