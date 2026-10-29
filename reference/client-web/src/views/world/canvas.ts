/**
 * The world canvas (REF-12.1, REF-14.3). One SVG holds the whole world; a
 * single camera transform group moves everything. Layers, in paint order:
 * sea, lanes, islands, selection. The viewed location's HTML grid renderer is
 * mounted as an overlay above the SVG and positioned from the camera, so the
 * existing grid view (entities, overlays, ghost) is reused unchanged instead of
 * being re-implemented in SVG.
 *
 * Levels of detail: `world` draws silhouettes, lanes, and fog only;
 * `location` and `detail` additionally show the viewed location's grid in
 * place. Rendering is scheduled through one animation frame and only runs when
 * something changed.
 *
 * Source: REF-12.1, REF-12.2, REF-14.3, PIC-9.3
 */
import { svg } from '../../dom/h.js';
import type { Camera } from '../../store/view-state.js';
import { worldToScreen, zoomLevel } from '../../selectors/camera.js';
import type { Viewport } from '../../selectors/camera.js';
import { islandOf } from '../../selectors/layout.js';
import type { IslandLayout, WorldLayout } from '../../selectors/layout.js';

/** What the canvas needs from its host. */
export interface CanvasDeps {
  readonly layout: () => WorldLayout;
  readonly camera: () => Camera;
  readonly selected: () => number | null;
  readonly onSelectIsland: (locationId: number) => void;
}

/** A mounted canvas. */
export interface WorldCanvas {
  readonly el: SVGElement;
  /** Requests a render on the next animation frame (REF-14.3). */
  invalidate(): void;
  /** The current viewport in screen pixels. */
  viewport(): Viewport;
  /** The camera transform applied this frame, for tests. */
  transform(): string;
  /** The number of rendered frames, for tests. */
  frames(): number;
  /** The screen position and edge of an island, for the grid overlay. */
  islandScreen(
    locationId: number,
  ): { readonly x: number; readonly y: number; readonly size: number } | null;
}

/**
 * A deterministic island silhouette: an eight-sided polygon around the island
 * centre, sized from the grid (REF-12.1). Unknown islands render as fog clouds
 * (a rounded blob path) and carry no attributes.
 *
 * Source: REF-12.1
 */
const islandPolygon = (island: IslandLayout): string => {
  const half = island.size / 2;
  const jag = island.size / 5;
  const { x, y } = island;
  const points: Array<[number, number]> = [
    [x - half, y],
    [x - half + jag, y - half + jag],
    [x, y - half],
    [x + half - jag, y - half + jag],
    [x + half, y],
    [x + half - jag, y + half - jag],
    [x, y + half],
    [x - half + jag, y + half - jag],
  ];
  return points.map(([px, py]) => `${Math.round(px)},${Math.round(py)}`).join(' ');
};

const fogPath = (island: IslandLayout): string => {
  const r = island.size / 2;
  const { x, y } = island;
  return [
    `M ${x - r} ${y}`,
    `a ${r} ${r} 0 1 0 ${r * 2} 0`,
    `a ${r * 0.7} ${r * 0.7} 0 1 0 ${-r * 1.4} 0`,
    'Z',
  ].join(' ');
};

/** Creates the world canvas (REF-12.1). */
export function createWorldCanvas(deps: CanvasDeps): WorldCanvas {
  const sea = svg('rect', {
    class: 'canvas-sea',
    x: '-10000',
    y: '-10000',
    width: '20000',
    height: '20000',
  });
  const laneLayer = svg('g', { class: 'canvas-lanes', 'data-testid': 'canvas-lanes' });
  const islandLayer = svg('g', { class: 'canvas-islands', 'data-testid': 'canvas-islands' });
  const selectionLayer = svg('g', { class: 'canvas-selection', 'data-testid': 'canvas-selection' });
  const cameraGroup = svg('g', { class: 'canvas-camera', 'data-testid': 'canvas-camera' });
  cameraGroup.append(sea, laneLayer, islandLayer, selectionLayer);
  const el = svg(
    'svg',
    {
      class: 'world-canvas',
      'data-testid': 'world-canvas',
      role: 'img',
      'aria-label': 'World',
      preserveAspectRatio: 'xMidYMid meet',
    },
    cameraGroup,
  );

  let pending = false;
  let renderedFrames = 0;
  let currentTransform = '';
  // Structural caching (REF-14.6): islands and lanes are rebuilt only when the
  // layout or the level of detail changes; panning and zooming then cost one
  // transform write.
  let structureKey = '';
  let selectionKey = '';

  const viewport = (): Viewport => {
    const box = el.getBoundingClientRect();
    return { width: box.width > 0 ? box.width : 800, height: box.height > 0 ? box.height : 600 };
  };

  const render = (): void => {
    pending = false;
    renderedFrames += 1;
    const camera = deps.camera();
    const layout = deps.layout();
    const level = zoomLevel(camera.zoom);
    const box = viewport();
    currentTransform = `translate(${box.width / 2 - camera.x * camera.zoom} ${
      box.height / 2 - camera.y * camera.zoom
    }) scale(${camera.zoom})`;
    cameraGroup.setAttribute('transform', currentTransform);

    const nextStructure = `${level}:${layout.islands
      .map(
        (island) =>
          `${island.locationId}@${island.x},${island.y},${island.size},${island.knowledge}`,
      )
      .join(
        '|',
      )}#${layout.lanes.map((lane) => `${lane.id}:${lane.enabled}:${lane.durationTicks}`).join('|')}`;
    if (nextStructure !== structureKey) {
      structureKey = nextStructure;
      // Islands: silhouettes at every level; known ones carry their region mark.
      islandLayer.replaceChildren(
        ...layout.islands.map((island) => {
          const shape =
            island.knowledge === 'unknown'
              ? svg('path', {
                  class: 'island island-fog',
                  d: fogPath(island),
                  'data-testid': `island-${island.locationId}`,
                  'data-known': 'false',
                })
              : svg('polygon', {
                  class: 'island',
                  points: islandPolygon(island),
                  'data-testid': `island-${island.locationId}`,
                  'data-known': 'true',
                  'data-region': island.region,
                });
          shape.setAttribute('role', 'img');
          shape.setAttribute('aria-label', `location ${island.locationId}`);
          shape.addEventListener('click', () => deps.onSelectIsland(island.locationId));
          return shape;
        }),
      );

      // Lanes appear once; the duration label shows at detail zoom only.
      laneLayer.replaceChildren(
        ...layout.lanes.flatMap((lane) => {
          const from = islandOf(layout, lane.from);
          const to = islandOf(layout, lane.to);
          if (from === null || to === null) return [];
          const line = svg('line', {
            class: lane.enabled ? 'lane' : 'lane lane-disabled',
            x1: from.x,
            y1: from.y,
            x2: to.x,
            y2: to.y,
            'data-testid': `lane-${lane.id}`,
            'data-enabled': lane.enabled ? 'true' : 'false',
          });
          if (level !== 'detail' || lane.durationTicks === null) return [line];
          return [
            line,
            svg(
              'text',
              {
                class: 'lane-label',
                x: (from.x + to.x) / 2,
                y: (from.y + to.y) / 2 - 6,
                'data-testid': `lane-label-${lane.id}`,
              },
              `${Math.round(lane.durationTicks / 60)} min`,
            ),
          ];
        }),
      );
    }

    const selected = deps.selected();
    const island = selected === null ? null : islandOf(layout, selected);
    const nextSelection =
      selected === null ? '' : `${selected}:${island?.x},${island?.y},${island?.size}`;
    if (nextSelection !== selectionKey) {
      selectionKey = nextSelection;
      selectionLayer.replaceChildren(
        ...(island === null
          ? []
          : [
              svg('circle', {
                class: 'island-selected',
                cx: island.x,
                cy: island.y,
                r: island.size * 0.62,
                'data-testid': 'island-selection',
              }),
            ]),
      );
    }
  };

  const invalidate = (): void => {
    if (pending) return;
    pending = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(render);
    else render();
  };

  return {
    el,
    invalidate,
    viewport,
    transform: () => currentTransform,
    frames: () => renderedFrames,
    islandScreen(locationId) {
      const island = islandOf(deps.layout(), locationId);
      if (island === null) return null;
      const screen = worldToScreen(deps.camera(), { x: island.x, y: island.y }, viewport());
      return { x: screen.x, y: screen.y, size: island.size * deps.camera().zoom };
    },
  };
}

/** True when the grid overlay is visible at this zoom (REF-12.1). */
export const showsGrid = (zoom: number): boolean => zoomLevel(zoom) !== 'world';
