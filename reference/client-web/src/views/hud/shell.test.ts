/**
 * The HUD shell: the frame's regions, the action bar's controls, and the
 * provisional window host (REF-11, design D2/D3).
 *
 * Source: REF-11, REF-12.4
 */
import { describe, expect, it } from 'vitest';

import { signal } from '../../store/signals.js';
import type { ViewState } from '../../store/view-state.js';
import { createActionBar } from './action-bar.js';
import type { WindowKind } from './action-bar.js';
import { createHudFrame } from './frame.js';
import { createLocationBannerView } from './location-banner.js';
import { createResourceBarView } from './resource-bar.js';
import { createWindowHost } from './window-host.js';

import { createFormatter } from '../../format/index.js';

const formatter = createFormatter({
  baseScale: 6000,
  grouping: true,
  decimals: 0,
  perMinute: true,
  tickDurationMs: 1000,
});

const view = (): ViewState => ({
  selection: signal(null),
  location: signal(null),
  mode: signal('inspect'),
  placement: signal({ definitionId: null, position: [0, 0], orientation: 0, result: null }),
  locale: signal('en'),
  overlay: signal(null),
  drawer: signal(null),
  debug: signal(false),
  worldMap: signal(false),
  pins: signal([]),
  windows: signal([]),
  camera: signal({ x: 0, y: 0, zoom: 1 }),
  theme: signal('light'),
});

const mirror = (tick: number, blocked: number) => {
  const projection = signal({
    session_id: 's',
    tick,
    revision: 0,
    configuration_checksum: 'c',
    owners: [],
    locations: [],
    entities: Array.from({ length: blocked }, (_, index) => ({
      entity_id: index + 1,
      production: { state: 'blocked', progress: 0, progress_scale: 1, block_reasons: ['input'] },
    })),
  });
  return { projection, events: signal([]) };
};

const client = () => {
  const calls: string[] = [];
  return {
    calls,
    control: (kind: string, payload?: unknown) => calls.push(`${kind}:${JSON.stringify(payload)}`),
    save: (slot: string) => calls.push(`save:${slot}`),
    load: (slot: string) => calls.push(`load:${slot}`),
  };
};

describe('[REF-11] HUD frame', () => {
  it('[REF-11] the frame mounts all six regions plus the world area', () => {
    const frame = createHudFrame();
    expect(frame.el.getAttribute('data-testid')).toBe('hud');
    for (const region of [
      'resource-bar',
      'location-banner',
      'news-rail',
      'minimap',
      'world-area',
      'action-bar',
      'context-panel',
    ]) {
      expect(frame.el.querySelector(`[data-testid="${region}"]`)).not.toBeNull();
    }
    expect(frame.el.querySelector('[data-testid="top-bar"]')).toBeNull();
    expect(frame.el.querySelector('[data-testid="drawer"]')).toBeNull();
  });

  it('[REF-11] the resource bar renders the balance, rate, and chips', () => {
    const view = createResourceBarView(formatter);
    view.show({
      balance: '1,000',
      netRate: '+1/min',
      chips: [{ resourceId: 'r', label: 'BM1', value: '4', pinned: true }],
    });
    expect(view.el.querySelector('[data-testid="resource-bar-balance"]')?.textContent).toBe(
      '1,000',
    );
    expect(view.el.querySelector('[data-testid="resource-bar-net"]')?.textContent).toBe('+1/min');
    expect(view.el.querySelector('[data-testid="resource-chip-r"]')?.textContent).toContain('BM1');
  });

  it('[REF-11] the banner renders the empty state for an unknown location', () => {
    const view = createLocationBannerView();
    view.show(null);
    expect(view.el.querySelector('[data-testid="banner-empty"]')).not.toBeNull();
    view.show({
      code: 'alpha_1',
      region: 'ref.tier.region.alpha',
      owned: true,
      slotTypes: ['ref.tier.slot.v_a'],
      suitability: [{ property: 'ref.tier.property.suitability_p1', permille: 1000 }],
    });
    expect(view.el.querySelector('[data-testid="banner-code"]')?.textContent).toBe('alpha_1');
    expect(view.el.querySelector('[data-testid="banner-region"]')?.textContent).toBe('alpha');
    expect(view.el.querySelector('[data-testid="banner-ownership"]')?.textContent).toBe('owned');
    expect(view.el.querySelector('[data-testid="banner-slot-ref.tier.slot.v_a"]')).not.toBeNull();
  });
});

describe('[REF-11][REF-13.2] action bar', () => {
  it('[REF-11] the tick and blocked count follow the projection', () => {
    const bar = createActionBar(client() as never, mirror(7, 2) as never, view(), () => undefined);
    expect(bar.el.querySelector('[data-testid="action-tick"]')?.textContent).toBe('tick 7');
    expect(bar.el.querySelector('[data-testid="action-blocked"]')?.textContent).toBe('2 blocked');
  });

  it('[REF-13.2] the controls issue control commands', () => {
    const fake = client();
    const bar = createActionBar(fake as never, mirror(0, 0) as never, view(), () => undefined);
    const click = (testId: string): void => {
      (bar.el.querySelector(`[data-testid="${testId}"]`) as HTMLElement).click();
    };
    click('action-play');
    click('action-pause');
    click('action-step');
    click('action-save');
    click('action-load');
    expect(fake.calls.some((call) => call.startsWith('run:'))).toBe(true);
    expect(fake.calls.some((call) => call.startsWith('pause:'))).toBe(true);
    expect(fake.calls.some((call) => call.startsWith('step:{"ticks":1}'))).toBe(true);
    expect(fake.calls).toContain('save:auto');
    expect(fake.calls).toContain('load:auto');
  });

  it('[REF-12.4] the window toggles report the window kind', () => {
    const kinds: WindowKind[] = [];
    const bar = createActionBar(client() as never, mirror(0, 0) as never, view(), (kind) =>
      kinds.push(kind),
    );
    for (const kind of ['economy', 'planning', 'logistics', 'exchange', 'population']) {
      (bar.el.querySelector(`[data-testid="action-window-${kind}"]`) as HTMLElement).click();
    }
    (bar.el.querySelector('[data-testid="action-tables"]') as HTMLElement).click();
    expect(kinds).toEqual(['economy', 'planning', 'logistics', 'exchange', 'population', 'tables']);
  });
});

describe('[REF-12.4] provisional window host', () => {
  it('[REF-12.4] registering, toggling, and closing preserve open order', () => {
    const host = createWindowHost();
    const economy = document.createElement('div');
    const planning = document.createElement('div');
    host.register({ kind: 'economy', title: 'Economy', el: economy });
    host.register({ kind: 'planning', title: 'Planning', el: planning });
    host.toggle('economy');
    host.toggle('planning');
    expect(host.openKinds()).toEqual(['economy', 'planning']);
    host.toggle('economy');
    expect(host.openKinds()).toEqual(['planning']);
    host.open('economy');
    host.closeTop();
    expect(host.openKinds()).toEqual(['planning']);
    host.close('planning');
    expect(host.openKinds()).toEqual([]);
  });

  it('[REF-12.4] the pane is hidden until its window opens', () => {
    const host = createWindowHost();
    host.register({ kind: 'economy', title: 'Economy', el: document.createElement('div') });
    const pane = host.el.querySelector('[data-testid="window-economy"]') as HTMLElement;
    expect(pane.hidden).toBe(true);
    host.open('economy');
    expect(pane.hidden).toBe(false);
  });
});
