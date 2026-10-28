/**
 * Layout and camera selectors (REF-12.1, REF-13.5). The layout is
 * presentation-only and deterministic; the camera helpers are pure so their
 * zoom, anchor, clamp, and Home behaviour is unit-tested without a DOM.
 *
 * Source: REF-12.1, REF-13.5
 */
import { describe, expect, it } from 'vitest';

import type { ConnectionDto, LocationDto } from '@aesfw/protocol';

import {
  LOCATION_ZOOM,
  DETAIL_ZOOM,
  clampCamera,
  homeCamera,
  panBy,
  screenToWorld,
  worldToScreen,
  zoomAround,
  zoomLevel,
} from './camera.js';
import { islandOf, worldLayout } from './layout.js';
import { minimapProjection, minimapToWorld, viewportRect } from './minimap.js';

const location = (id: number, region: string, grid = 40, known = true): LocationDto => ({
  entity_id: id,
  definition_id: `ref.tier.location.${id}`,
  knowledge: known ? 'established' : 'unknown',
  active: true,
  properties: region === '' ? { tags: [] } : { tags: [], region },
  ...(known ? { grid: { width: grid, height: grid, blocked: [] } } : {}),
});

const viewport = { width: 800, height: 600 };

describe('[REF-12.1] world layout', () => {
  it('[REF-12.1] regions are clusters in ascending order and locations on a ring', () => {
    const layout = worldLayout([
      location(4, 'ref.tier.region.beta'),
      location(1, 'ref.tier.region.alpha'),
      location(2, 'ref.tier.region.alpha'),
      location(3, 'ref.tier.region.alpha'),
    ]);
    expect(layout.regions).toEqual(['ref.tier.region.alpha', 'ref.tier.region.beta']);
    const alpha = layout.islands.filter((island) => island.region === 'ref.tier.region.alpha');
    expect(alpha.map((island) => island.locationId)).toEqual([1, 2, 3]);
    // Alpha's cluster sits left of beta's.
    const beta = islandOf(layout, 4);
    expect(Math.max(...alpha.map((island) => island.x))).toBeLessThan(beta?.x ?? 0);
  });

  it('[REF-12.1] islands are sized from their grid and stable across calls', () => {
    const first = worldLayout([location(1, 'a', 40), location(2, 'a', 10)]);
    const second = worldLayout([location(1, 'a', 40), location(2, 'a', 10)]);
    expect(first).toEqual(second);
    const large = islandOf(first, 1)?.size ?? 0;
    const small = islandOf(first, 2)?.size ?? 0;
    expect(large).toBeGreaterThan(small);
  });

  it('[REF-12.1] lanes appear once and keep their duration and enabled state', () => {
    const lane: ConnectionDto = {
      connection_id: 'conn.a_b',
      origin_id: 1,
      destination_id: 2,
      base_duration_ticks: 300,
      enabled: true,
    };
    const layout = worldLayout(
      [location(1, 'a'), location(2, 'a')],
      [lane, { ...lane, origin_id: 2, destination_id: 1 }],
    );
    expect(layout.lanes).toHaveLength(1);
    expect(layout.lanes[0]?.durationTicks).toBe(300);
    expect(layout.lanes[0]?.enabled).toBe(true);
  });

  it('[PIC-9.3] an unknown location keeps its island but no attributes', () => {
    const layout = worldLayout([location(1, 'a'), location(2, 'a', 40, false)]);
    expect(islandOf(layout, 2)?.knowledge).toBe('unknown');
  });
});

describe('[REF-13.5] camera', () => {
  it('[REF-13.5] zoom buckets map to the three levels of detail', () => {
    expect(zoomLevel(0.5)).toBe('world');
    expect(zoomLevel(LOCATION_ZOOM)).toBe('location');
    expect(zoomLevel(DETAIL_ZOOM)).toBe('detail');
  });

  it('[REF-13.5] screen and world conversions are inverse', () => {
    const camera = { x: 120, y: -40, zoom: 1.5 };
    const point = { x: 300, y: 200 };
    const world = screenToWorld(camera, point, viewport);
    const back = worldToScreen(camera, world, viewport);
    expect(Math.round(back.x)).toBe(point.x);
    expect(Math.round(back.y)).toBe(point.y);
  });

  it('[REF-13.5] zooming keeps the world point under the cursor fixed', () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    const anchor = { x: 600, y: 150 };
    const before = screenToWorld(camera, anchor, viewport);
    const zoomed = zoomAround(camera, 2, anchor, viewport);
    const after = screenToWorld(zoomed, anchor, viewport);
    expect(Math.round(after.x)).toBe(Math.round(before.x));
    expect(Math.round(after.y)).toBe(Math.round(before.y));
    expect(zoomed.zoom).toBe(2);
  });

  it('[REF-13.5] zoom is clamped and panning is zoom-scaled', () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    expect(zoomAround(camera, 100, { x: 0, y: 0 }, viewport).zoom).toBeLessThanOrEqual(6);
    expect(zoomAround(camera, 0.0001, { x: 0, y: 0 }, viewport).zoom).toBeGreaterThanOrEqual(0.35);
    expect(panBy(camera, { x: 100, y: 50 })).toEqual({ x: -100, y: -50, zoom: 1 });
    expect(panBy({ ...camera, zoom: 2 }, { x: 100, y: 50 })).toEqual({
      x: -50,
      y: -25,
      zoom: 2,
    });
  });

  it('[REF-13.5] clamping keeps the world in view and centres a small world', () => {
    const bounds = { minX: -100, minY: -100, maxX: 100, maxY: 100 };
    const clamped = clampCamera({ x: 10_000, y: -10_000, zoom: 1 }, bounds, viewport);
    // The world is smaller than the viewport, so it stays centred.
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
    const wide = { minX: -2000, minY: -2000, maxX: 2000, maxY: 2000 };
    const panned = clampCamera({ x: 10_000, y: -10_000, zoom: 1 }, wide, viewport);
    expect(panned.x).toBe(2000 - viewport.width / 2);
    expect(panned.y).toBe(-2000 + viewport.height / 2);
    const small = { minX: -10, minY: -10, maxX: 10, maxY: 10 };
    expect(clampCamera({ x: 50, y: 50, zoom: 1 }, small, viewport)).toEqual({
      x: 0,
      y: 0,
      zoom: 1,
    });
  });

  it('[REF-13.5] Home centres on the first established location', () => {
    const layout = worldLayout([location(1, 'a'), location(2, 'a')]);
    const camera = homeCamera(layout, [2]);
    expect(camera.x).toBe(islandOf(layout, 2)?.x);
    expect(camera.y).toBe(islandOf(layout, 2)?.y);
    expect(camera.zoom).toBe(LOCATION_ZOOM);
    expect(homeCamera({ ...layout, islands: [] }, []).zoom).toBe(LOCATION_ZOOM);
  });
});

describe('[REF-11] minimap', () => {
  it('[REF-11] a click maps back to the world and the viewport rectangle updates', () => {
    const bounds = { minX: -200, minY: -200, maxX: 400, maxY: 200 };
    const projection = minimapProjection(bounds, { width: 180, height: 120 });
    const camera = minimapToWorld(projection, { x: 90, y: 60 }, 2);
    expect(Math.round(camera.x)).toBe(100);
    expect(Math.round(camera.y)).toBe(0);
    expect(camera.zoom).toBe(2);
    const rect = viewportRect(projection, { x: 0, y: 0, zoom: 1 }, viewport);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
});
