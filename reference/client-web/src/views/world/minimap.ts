/**
 * The minimap (REF-11): the world layout fitted into the bottom-left slot, the
 * viewport rectangle, and click-to-move. The population strip below it shows the
 * viewed location's population per tier, or the owner total when nothing is
 * viewed.
 *
 * Source: REF-11, PIC-10.2
 */
import { h, svg } from '../../dom/h.js';
import { worldToScreen } from '../../selectors/camera.js';
import type { Camera } from '../../store/view-state.js';
import { islandOf } from '../../selectors/layout.js';
import type { WorldLayout } from '../../selectors/layout.js';
import {
  minimapProjection,
  minimapToWorld,
  viewportRect,
  worldToMinimap,
} from '../../selectors/minimap.js';
import type { MinimapBox } from '../../selectors/minimap.js';

/** What the minimap needs from its host. */
export interface MinimapDeps {
  readonly layout: () => WorldLayout;
  readonly camera: () => Camera;
  readonly viewport: () => { readonly width: number; readonly height: number };
  readonly population: () => Readonly<Record<string, number>>;
  readonly onMove: (camera: Camera) => void;
}

/** A mounted minimap. */
export interface Minimap {
  readonly el: HTMLElement;
  update(): void;
}

const BOX: MinimapBox = { width: 168, height: 112 };

/** Creates the minimap and population strip (REF-11). */
export function createMinimap(deps: MinimapDeps): Minimap {
  const map = svg('svg', {
    class: 'hud-minimap-svg',
    'data-testid': 'minimap-svg',
    width: String(BOX.width),
    height: String(BOX.height),
    role: 'img',
    'aria-label': 'World map',
  });
  const worldLayer = svg('g', { class: 'minimap-world', 'data-testid': 'minimap-world' });
  const rect = svg('rect', {
    class: 'minimap-viewport',
    'data-testid': 'minimap-viewport',
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const strip = h('ul', { class: 'hud-population-strip', 'data-testid': 'population-strip' });
  map.append(worldLayer, rect);
  const el = h('div', { class: 'hud-minimap-inner' }, map, strip);
  // Structural caching (REF-14.6): the world layer is rebuilt only when the
  // layout changes; every update writes the viewport rectangle and population.
  let structureKey = '';

  map.addEventListener('click', (event) => {
    const bounds = map.getBoundingClientRect();
    const projection = minimapProjection(deps.layout().bounds, BOX);
    deps.onMove(
      minimapToWorld(
        projection,
        { x: event.clientX - bounds.left, y: event.clientY - bounds.top },
        deps.camera().zoom,
      ),
    );
  });

  const update = (): void => {
    const layout = deps.layout();
    const projection = minimapProjection(layout.bounds, BOX);
    const nextStructure = `${layout.islands
      .map(
        (island) =>
          `${island.locationId}@${island.x},${island.y},${island.size},${island.knowledge}`,
      )
      .join('|')}#${layout.lanes.map((lane) => `${lane.id}:${lane.from}:${lane.to}`).join('|')}`;
    if (nextStructure !== structureKey) {
      structureKey = nextStructure;
      worldLayer.replaceChildren(
        ...layout.islands.map((island) => {
          const point = worldToMinimap(projection, island);
          return svg('circle', {
            class: island.knowledge === 'unknown' ? 'minimap-island minimap-fog' : 'minimap-island',
            cx: point.x,
            cy: point.y,
            r: Math.max(2, (island.size / 2) * projection.scale),
            'data-testid': `minimap-island-${island.locationId}`,
          });
        }),
        ...layout.lanes.flatMap((lane) => {
          const from = islandOf(layout, lane.from);
          const to = islandOf(layout, lane.to);
          if (from === null || to === null) return [];
          const a = worldToMinimap(projection, from);
          const b = worldToMinimap(projection, to);
          return [
            svg('line', {
              class: 'minimap-lane',
              x1: a.x,
              y1: a.y,
              x2: b.x,
              y2: b.y,
            }),
          ];
        }),
      );
    }
    const camera = deps.camera();
    const view = viewportRect(projection, camera, deps.viewport());
    rect.setAttribute('x', String(view.x));
    rect.setAttribute('y', String(view.y));
    rect.setAttribute('width', String(view.width));
    rect.setAttribute('height', String(view.height));

    strip.replaceChildren(
      ...Object.entries(deps.population())
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([tier, count]) =>
          h(
            'li',
            { class: 'hud-population-entry', 'data-testid': `population-${tier}` },
            h('span', { class: 'hud-population-tier', text: tier.split('.').at(-1) ?? tier }),
            h('span', { class: 'hud-population-count', text: String(count) }),
          ),
        ),
    );
  };

  return { el, update };
}

/** The screen position of a world point, re-exported for the grid overlay. */
export const screenOf = (
  camera: Camera,
  point: { readonly x: number; readonly y: number },
  viewport: { readonly width: number; readonly height: number },
): { readonly x: number; readonly y: number } => worldToScreen(camera, point, viewport);
