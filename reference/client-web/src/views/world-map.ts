/**
 * World-map view (REF-12.1, REF-14.3). Draws locations, connections, and
 * transport dots as SVG. Transport dots move to their new location with a CSS
 * transform transition, so interpolation never delays authoritative state.
 *
 * Source: REF-12.1, REF-14.3
 */
import { h, replaceChildren, svg } from '../dom/h.js';
import { worldMap } from '../selectors/index.js';
import type { Mirror } from '../store/mirror.js';

/** A mounted world map. */
export interface WorldMapView {
  readonly el: HTMLElement;
  update(): void;
}

/** A location selected on the map. */
export interface WorldMapSelection {
  readonly locationId: number;
  readonly knowledge: string;
  readonly active: boolean;
  readonly ownerId?: string;
}

/** Interaction callbacks of the map (REF-12.1 commands). */
export interface WorldMapDeps {
  readonly onSelect?: (selection: WorldMapSelection) => void;
}

const label = (point: { readonly locationId: number; readonly knowledge: string }): string =>
  point.knowledge === 'unknown' ? `${point.locationId}` : `${point.locationId} ${point.knowledge}`;

/**
 * Creates the world-map view (REF-12.1). Unknown locations render a dashed
 * outline with their ID only; clicking a location reports it to `deps.onSelect`
 * for the map commands (activate, deactivate, explore, establish).
 *
 * Source: REF-12.1, REF-14.3
 */
export function createWorldMap(mirror: Mirror, deps: WorldMapDeps = {}): WorldMapView {
  const canvas = svg('svg', {
    class: 'world-map',
    viewBox: '0 0 1000 800',
    preserveAspectRatio: 'xMidYMid meet',
    'data-testid': 'world-map',
  });
  const el = h('div', { class: 'world-map-frame', hidden: true }, canvas);

  const update = (): void => {
    const projection = mirror.projection();
    const model = worldMap(projection?.locations ?? [], projection?.entities ?? []);
    const nodes: SVGElement[] = [];
    for (const connection of model.connections) {
      nodes.push(
        svg('line', {
          x1: connection.from.x,
          y1: connection.from.y,
          x2: connection.to.x,
          y2: connection.to.y,
          class: connection.enabled ? 'world-connection' : 'world-connection disabled',
          'data-testid': `world-connection-${connection.connectionId}`,
        }),
      );
      const midX = (connection.from.x + connection.to.x) / 2;
      const midY = (connection.from.y + connection.to.y) / 2;
      nodes.push(
        svg('text', {
          x: midX,
          y: midY - 6,
          class: 'world-connection-label',
          'text-anchor': 'middle',
          text: `${connection.baseDurationTicks}`,
        }),
      );
    }
    for (const point of model.points) {
      const group = svg('g', {
        class: `world-location knowledge-${point.knowledge}`,
        transform: `translate(${point.x}, ${point.y})`,
        'data-testid': `world-location-${point.locationId}`,
        role: 'button',
      });
      group.append(
        svg('rect', {
          x: -26,
          y: -18,
          width: 52,
          height: 36,
          rx: 6,
          class:
            point.knowledge === 'unknown'
              ? 'world-location-shape unknown'
              : point.active
                ? 'world-location-shape'
                : 'world-location-shape inactive',
        }),
      );
      group.append(
        svg('text', {
          x: 0,
          y: 4,
          class: 'world-location-label',
          'text-anchor': 'middle',
          text: label(point),
        }),
      );
      if (point.ownerId !== undefined && point.knowledge !== 'unknown') {
        group.append(
          svg('circle', {
            cx: 20,
            cy: -14,
            r: 4,
            class: 'world-owner-mark',
          }),
        );
      }
      const selection = {
        locationId: point.locationId,
        knowledge: point.knowledge,
        active: point.active,
        ...(point.ownerId === undefined ? {} : { ownerId: point.ownerId }),
      };
      group.addEventListener('click', () => deps.onSelect?.(selection));
      nodes.push(group);
    }
    for (const transport of model.transports) {
      nodes.push(
        svg('circle', {
          cx: 0,
          cy: 0,
          r: 5,
          class: `transport-dot state-${transport.state}`,
          transform: `translate(${transport.x}, ${transport.y})`,
          'data-testid': `world-transport-${transport.entityId}`,
        }),
      );
    }
    replaceChildren(canvas, ...nodes);
  };

  return {
    el,
    update,
  };
}
