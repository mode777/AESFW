/**
 * Minimap projection (REF-11): the world layout fitted into the minimap box,
 * the viewport rectangle, and click-to-world for camera moves.
 *
 * Source: REF-11
 */
import type { Camera } from '../store/view-state.js';
import type { Viewport } from './camera.js';
import type { WorldLayout } from './layout.js';

/** The minimap box, in pixels. */
export interface MinimapBox {
  readonly width: number;
  readonly height: number;
}

/** The scale and offset that fit the world into the minimap. */
export interface MinimapProjection {
  readonly scale: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/** Fits the world bounds into the minimap box, preserving aspect ratio. */
export function minimapProjection(
  bounds: WorldLayout['bounds'],
  box: MinimapBox,
): MinimapProjection {
  const worldWidth = bounds.maxX - bounds.minX || 1;
  const worldHeight = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(box.width / worldWidth, box.height / worldHeight);
  return {
    scale,
    offsetX: (box.width - worldWidth * scale) / 2 - bounds.minX * scale,
    offsetY: (box.height - worldHeight * scale) / 2 - bounds.minY * scale,
  };
}

/** World → minimap pixels. */
export const worldToMinimap = (
  projection: MinimapProjection,
  point: { readonly x: number; readonly y: number },
): { readonly x: number; readonly y: number } => ({
  x: point.x * projection.scale + projection.offsetX,
  y: point.y * projection.scale + projection.offsetY,
});

/**
 * A minimap click as the camera centre it requests (REF-11).
 *
 * Source: REF-11
 */
export function minimapToWorld(
  projection: MinimapProjection,
  point: { readonly x: number; readonly y: number },
  zoom: number,
): Camera {
  return {
    x: (point.x - projection.offsetX) / projection.scale,
    y: (point.y - projection.offsetY) / projection.scale,
    zoom,
  };
}

/** The camera's viewport rectangle in minimap pixels (REF-11). */
export const viewportRect = (
  projection: MinimapProjection,
  camera: Camera,
  viewport: Viewport,
): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } => {
  const width = viewport.width / camera.zoom;
  const height = viewport.height / camera.zoom;
  const topLeft = worldToMinimap(projection, {
    x: camera.x - width / 2,
    y: camera.y - height / 2,
  });
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: width * projection.scale,
    height: height * projection.scale,
  };
};
