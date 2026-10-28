/**
 * The HUD frame (REF-11): a fixed full-bleed layout with six regions. The frame
 * renders once and hands each region to the caller as a mount point, so later
 * rows fill the minimap, news, and context-panel slots without touching the
 * layout.
 *
 * Source: REF-11, REF-14.1
 */
import { h } from '../../dom/h.js';

/** The six regions of the HUD (REF-11). */
export interface HudRegions {
  readonly resourceBar: HTMLElement;
  readonly banner: HTMLElement;
  readonly news: HTMLElement;
  readonly minimap: HTMLElement;
  readonly actionBar: HTMLElement;
  readonly contextPanel: HTMLElement;
}

/** A mounted HUD frame. */
export interface HudFrame {
  readonly el: HTMLElement;
  readonly world: HTMLElement;
  readonly regions: HudRegions;
}

/**
 * Creates the HUD frame (REF-11). The world area is the frame's centre cell;
 * the caller mounts the grid or canvas there.
 *
 * Source: REF-11
 */
export function createHudFrame(): HudFrame {
  const resourceBar = h('section', {
    class: 'hud-resource-bar',
    'data-testid': 'resource-bar',
    'aria-label': 'Resources',
  });
  const banner = h('section', {
    class: 'hud-banner',
    'data-testid': 'location-banner',
    'aria-label': 'Location',
  });
  const news = h('aside', {
    class: 'hud-news',
    'data-testid': 'news-rail',
    'aria-label': 'News',
  });
  const minimap = h('aside', {
    class: 'hud-minimap',
    'data-testid': 'minimap',
    'aria-label': 'Minimap',
  });
  const actionBar = h('footer', {
    class: 'hud-action-bar',
    'data-testid': 'action-bar',
    'aria-label': 'Actions',
  });
  const contextPanel = h('aside', {
    class: 'hud-context-panel',
    'data-testid': 'context-panel',
    'aria-label': 'Context',
  });
  const world = h('main', { class: 'hud-world', 'data-testid': 'world-area' });
  const el = h(
    'div',
    { class: 'hud', 'data-testid': 'hud' },
    resourceBar,
    banner,
    news,
    minimap,
    world,
    actionBar,
    contextPanel,
  );
  return {
    el,
    world,
    regions: { resourceBar, banner, news, minimap, actionBar, contextPanel },
  };
}
