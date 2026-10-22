/**
 * The location grid view (REF-12.2, REF-14.3). Renders the active location's
 * cells, entities as shapes, and the connectivity and suitability overlays as
 * layered SVG. It reads the mirror and client-local view state and computes no
 * mechanics.
 *
 * Source: REF-12.2, REF-14.3
 */
import { h, replaceChildren, svg } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import {
  connectivityOverlay,
  entityShapes,
  gridCells,
  suitabilityOverlay,
} from '../selectors/index.js';
import type { EntityShape, ShapeArchetype } from '../selectors/index.js';
import type { Mirror } from '../store/mirror.js';
import type { ViewState } from '../store/view-state.js';

/** A mounted location grid. */
export interface LocationGrid {
  readonly el: HTMLElement;
  update(): void;
}

const geometry = (shape: EntityShape): SVGElement[] => {
  const { x, y, width, height } = shape;
  const cx = x + width / 2;
  const cy = y + height / 2;
  const kind = shape.shape.kind;
  const nodes: SVGElement[] = [];
  if (kind === 'line') {
    nodes.push(svg('line', { x1: x, y1: cy, x2: x + width, y2: cy }));
    return nodes;
  }
  if (kind === 'circle') {
    nodes.push(svg('circle', { cx, cy, r: Math.min(width, height) / 2 }));
  } else if (kind === 'dot') {
    nodes.push(svg('circle', { cx, cy, r: 0.25 }));
  } else if (kind === 'diamond') {
    const points = `${cx},${y} ${x + width},${cy} ${cx},${y + height} ${x},${cy}`;
    nodes.push(svg('polygon', { points }));
  } else if (kind === 'triangle_ring' || kind === 'triangle_area') {
    const points = `${x},${y + height} ${x + width},${y + height} ${cx},${y}`;
    nodes.push(svg('polygon', { points }));
    if (kind === 'triangle_ring') {
      nodes.push(svg('circle', { cx, cy: y + height, r: 0.2 }));
    } else {
      nodes.push(svg('rect', { x, y, width, height, class: 'working-area' }));
    }
  } else {
    nodes.push(svg('rect', { x, y, width, height }));
    if (kind === 'square_inner_square' || kind === 'square_notches') {
      nodes.push(
        svg('rect', {
          x: x + width * 0.25,
          y: y + height * 0.25,
          width: width * 0.5,
          height: height * 0.5,
          class: 'inner',
        }),
      );
    } else if (kind === 'square_bars') {
      for (let index = 1; index <= 3; index += 1) {
        const barY = y + (height * index) / 4;
        nodes.push(
          svg('line', {
            x1: x + width * 0.2,
            y1: barY,
            x2: x + width * 0.8,
            y2: barY,
            class: 'inner',
          }),
        );
      }
    }
  }
  if (shape.state.progressPermille !== undefined) {
    const ratio = Math.min(1, Math.max(0, shape.state.progressPermille / 1000));
    nodes.push(
      svg('rect', {
        x,
        y: y + height - 0.15,
        width: width * ratio,
        height: 0.15,
        class: 'progress',
      }),
    );
  }
  if (shape.state.glyph !== undefined) {
    nodes.push(
      svg('text', {
        x: cx,
        y: cy,
        class: 'glyph',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
        text: shape.state.glyph,
      }),
    );
  }
  return nodes;
};

const renderShape = (shape: EntityShape): SVGElement => {
  const classes = [
    'grid-entity',
    `shape-${shape.shape.kind}`,
    `state-${shape.state.state}`,
    ...(shape.state.dashed === true ? ['dashed'] : []),
  ].join(' ');
  const group = svg('g', {
    class: classes,
    'data-testid': `grid-entity-${shape.entityId}`,
    'data-state': shape.state.state,
    'data-shape': shape.shape.kind,
    role: 'img',
    'aria-label': shape.label,
  });
  group.append(svg('title', { text: shape.label }));
  for (const node of geometry(shape)) group.append(node);
  return group;
};

/**
 * Creates the location grid view (REF-12.2).
 *
 * Source: REF-12.2, REF-14.3
 */
export function createLocationGrid(
  mirror: Mirror,
  view: ViewState,
  i18n: I18n,
  archetypes: () => ReadonlyMap<string, ShapeArchetype>,
  propertyId: string,
): LocationGrid {
  const legend = h('div', { class: 'grid-legend', 'data-testid': 'grid-legend' });
  const status = h('p', { class: 'grid-status', 'data-testid': 'grid-status' });
  const svgRoot = svg('svg', {
    class: 'grid-svg',
    'data-testid': 'location-grid',
    xmlns: 'http://www.w3.org/2000/svg',
  });
  const el = h('div', { class: 'location-grid' }, legend, status, svgRoot);

  const update = (): void => {
    const projection = mirror.projection();
    const locations = projection?.locations ?? [];
    const requested = view.location();
    const location = locations.find((entry) => entry.entity_id === requested) ?? locations[0];
    if (location === undefined) {
      svgRoot.removeAttribute('viewBox');
      replaceChildren(svgRoot);
      legend.textContent = '';
      status.textContent = i18n.t('grid.no_location');
      return;
    }
    const model = gridCells(location);
    if (model === null) {
      svgRoot.removeAttribute('viewBox');
      replaceChildren(svgRoot);
      legend.textContent = '';
      status.textContent = i18n.t('grid.no_grid');
      return;
    }
    svgRoot.setAttribute('viewBox', `0 0 ${model.width} ${model.height}`);

    const entities = projection?.entities ?? [];
    const shapes = entityShapes(location, entities, archetypes());
    const blockedPath = model.cells
      .filter((cell) => cell.blocked)
      .map((cell) => `M${cell.x} ${cell.y}h1v1h-1z`)
      .join('');
    const ruleLines: string[] = [];
    for (let x = 0; x <= model.width; x += 1) ruleLines.push(`M${x} 0V${model.height}`);
    for (let y = 0; y <= model.height; y += 1) ruleLines.push(`M0 ${y}H${model.width}`);

    const background = svg(
      'g',
      { class: 'grid-bg' },
      svg('path', { class: 'grid-cells', d: blockedPath }),
      svg('path', { class: 'grid-rules', d: ruleLines.join('') }),
    );

    const overlay = view.overlay();
    const overlayNodes: SVGElement[] = [];
    if (overlay === 'suitability') {
      const value = suitabilityOverlay(location, propertyId);
      overlayNodes.push(
        svg('rect', {
          class: 'grid-suitability',
          x: 0,
          y: 0,
          width: model.width,
          height: model.height,
          'data-suitability': value ?? '',
        }),
      );
      legend.textContent = `${i18n.t('overlay.suitability')}: ${i18n.t(propertyId)} ${
        value ?? '-'
      }`;
    } else if (overlay === 'connectivity') {
      const byId = new Map(shapes.map((shape) => [shape.entityId, shape]));
      for (const marker of connectivityOverlay(entities)) {
        const shape = byId.get(marker.entityId);
        if (shape === undefined) continue;
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        overlayNodes.push(
          svg(
            'g',
            {
              class: marker.connected ? 'grid-connectivity connected' : 'grid-connectivity',
              'data-testid': `grid-connectivity-${marker.entityId}`,
              'data-connected': String(marker.connected),
            },
            svg('line', { x1: model.width / 2, y1: model.height / 2, x2: cx, y2: cy }),
            svg('circle', { cx, cy, r: 0.3 }),
          ),
        );
      }
      legend.textContent = `${i18n.t('overlay.connectivity')}: ${overlayNodes.length}`;
    } else {
      legend.textContent = '';
    }

    replaceChildren(
      svgRoot,
      background,
      svg('g', { class: 'grid-overlay' }, ...overlayNodes),
      svg('g', { class: 'grid-entities' }, ...shapes.map(renderShape)),
    );
    status.textContent = `${model.width}×${model.height} · ${shapes.length}`;
  };

  view.location.subscribe(update);
  view.overlay.subscribe(update);
  mirror.projection.subscribe(update);
  update();
  return { el, update };
}
