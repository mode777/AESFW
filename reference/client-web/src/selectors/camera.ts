/**
 * Camera math for the world canvas (REF-13.5). Pure helpers: screen ↔ world
 * conversion, zoom buckets, anchoring a zoom on the cursor, panning, clamping,
 * and Home. The camera is client-local view state and never touches the
 * simulation.
 *
 * Source: REF-13.5, REF-12.1
 */
import type { Camera } from '../store/view-state.js';
import type { WorldLayout } from './layout.js';

/** A point in screen or world space. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** The viewport of the canvas, in screen pixels. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
}

/** The three levels of detail of REF-12.1, by zoom. */
export type ZoomLevel = 'world' | 'location' | 'detail';

/** The smallest and largest zoom factors. */
export const MIN_ZOOM = 0.35;
export const MAX_ZOOM = 6;

/** The zoom at which location level starts (terrain, entities). */
export const LOCATION_ZOOM = 1;
/** The zoom at which detail level starts (progress, areas, labels). */
export const DETAIL_ZOOM = 2.5;

/** The zoom bucket of a camera (REF-12.1). */
export const zoomLevel = (zoom: number): ZoomLevel => {
  if (zoom >= DETAIL_ZOOM) return 'detail';
  if (zoom >= LOCATION_ZOOM) return 'location';
  return 'world';
};

/** Converts a screen point to world coordinates. */
export const screenToWorld = (camera: Camera, point: Point, viewport: Viewport): Point => ({
  x: (point.x - viewport.width / 2) / camera.zoom + camera.x,
  y: (point.y - viewport.height / 2) / camera.zoom + camera.y,
});

/** Converts a world point to screen coordinates. */
export const worldToScreen = (camera: Camera, point: Point, viewport: Viewport): Point => ({
  x: (point.x - camera.x) * camera.zoom + viewport.width / 2,
  y: (point.y - camera.y) * camera.zoom + viewport.height / 2,
});

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/**
 * Zooms by `factor` around a screen anchor, keeping the world point under the
 * cursor fixed (REF-13.5).
 *
 * Source: REF-13.5
 */
export function zoomAround(
  camera: Camera,
  factor: number,
  anchor: Point,
  viewport: Viewport,
): Camera {
  const zoom = clampZoom(camera.zoom * factor);
  if (zoom === camera.zoom) return camera;
  const world = screenToWorld(camera, anchor, viewport);
  return {
    x: world.x - (anchor.x - viewport.width / 2) / zoom,
    y: world.y - (anchor.y - viewport.height / 2) / zoom,
    zoom,
  };
}

/** Pans by a screen-pixel delta (drag), at the current zoom. */
export const panBy = (camera: Camera, delta: Point): Camera => ({
  x: camera.x - delta.x / camera.zoom,
  y: camera.y - delta.y / camera.zoom,
  zoom: camera.zoom,
});

/**
 * Clamps the camera centre so the world cannot be dragged entirely out of the
 * viewport. A world smaller than the viewport stays centred.
 *
 * Source: REF-13.5
 */
export function clampCamera(
  camera: Camera,
  bounds: WorldLayout['bounds'],
  viewport: Viewport,
): Camera {
  const halfWidth = viewport.width / 2 / camera.zoom;
  const halfHeight = viewport.height / 2 / camera.zoom;
  const minX = bounds.minX + halfWidth;
  const maxX = bounds.maxX - halfWidth;
  const minY = bounds.minY + halfHeight;
  const maxY = bounds.maxY - halfHeight;
  return {
    zoom: camera.zoom,
    x: minX > maxX ? (bounds.minX + bounds.maxX) / 2 : Math.min(maxX, Math.max(minX, camera.x)),
    y: minY > maxY ? (bounds.minY + bounds.maxY) / 2 : Math.min(maxY, Math.max(minY, camera.y)),
  };
}

/**
 * Home: centres on the first established location, or on the layout centre when
 * nothing is established yet (REF-13.5).
 *
 * Source: REF-13.5
 */
export function homeCamera(
  layout: WorldLayout,
  established: readonly number[],
  zoom = LOCATION_ZOOM,
): Camera {
  const target =
    layout.islands.find((island) => established.includes(island.locationId)) ??
    layout.islands[0] ??
    null;
  if (target === null) return { x: 0, y: 0, zoom };
  return { x: target.x, y: target.y, zoom };
}
