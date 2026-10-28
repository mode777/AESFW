/**
 * The world canvas (REF-12.1, REF-14.3): islands, lanes, fog, selection, the
 * camera transform, and the grid overlay geometry.
 *
 * Source: REF-12.1, REF-12.2, REF-14.3, PIC-9.3
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocationDto } from '@aesfw/protocol';

import type { Camera } from '../../store/view-state.js';
import { worldLayout } from '../../selectors/layout.js';
import { createWorldCanvas, showsGrid } from './canvas.js';

const location = (id: number, known: boolean): LocationDto => ({
  entity_id: id,
  definition_id: `ref.tier.location.${id}`,
  knowledge: known ? 'established' : 'unknown',
  active: known,
  properties: { tags: [], region: 'a' },
  ...(known ? { grid: { width: 40, height: 40, blocked: [] } } : {}),
});

const lanes = [
  { connection_id: 'c1', origin_id: 1, destination_id: 2, base_duration_ticks: 300, enabled: true },
  {
    connection_id: 'c2',
    origin_id: 2,
    destination_id: 3,
    base_duration_ticks: 600,
    enabled: false,
  },
];

const make = (overrides: { camera?: Camera; selected?: number | null } = {}) => {
  const layout = worldLayout([location(1, true), location(2, true), location(3, false)], lanes);
  let camera = overrides.camera ?? { x: 0, y: 0, zoom: 1 };
  const selected = overrides.selected ?? null;
  const canvas = createWorldCanvas({
    layout: () => layout,
    camera: () => camera,
    selected: () => selected,
    onSelectIsland: () => undefined,
  });
  return {
    canvas,
    layout,
    setCamera: (next: Camera) => {
      camera = next;
    },
  };
};

beforeEach(() => {
  // jsdom schedules rAF as a timer; the canvas is frame-gated, so tests run the
  // frame synchronously.
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('[REF-12.1] world canvas', () => {
  it('[REF-12.1] islands and lanes render once, with fog for unknown locations', () => {
    const { canvas, layout } = make();
    canvas.invalidate();
    const el = canvas.el;
    expect(el.querySelectorAll('[data-testid^="island-"]')).toHaveLength(3);
    expect(el.querySelectorAll('[data-testid^="lane-"]')).toHaveLength(2);
    // A lane is drawn once even though the snapshot lists it on both ends.
    expect(layout.lanes).toHaveLength(2);
    expect(el.querySelector('[data-testid="island-3"]')?.getAttribute('data-known')).toBe('false');
    expect(el.querySelector('[data-testid="island-1"]')?.getAttribute('data-known')).toBe('true');
    expect(el.querySelector('[data-testid="lane-c2"]')?.getAttribute('data-enabled')).toBe('false');
  });

  it('[REF-12.1] the duration label appears at detail zoom only', () => {
    const { canvas, setCamera } = make();
    canvas.invalidate();
    expect(canvas.el.querySelector('[data-testid="lane-label-c1"]')).toBeNull();
    setCamera({ x: 0, y: 0, zoom: 3 });
    canvas.invalidate();
    expect(canvas.el.querySelector('[data-testid="lane-label-c1"]')?.textContent).toBe('5 min');
  });

  it('[REF-14.3] rendering is gated by invalidate and the camera transform tracks the camera', () => {
    const { canvas, setCamera } = make();
    canvas.invalidate();
    const frames = canvas.frames();
    // Reading state without invalidating does not re-render.
    expect(canvas.frames()).toBe(frames);
    setCamera({ x: 100, y: -50, zoom: 2 });
    canvas.invalidate();
    expect(canvas.frames()).toBe(frames + 1);
    expect(canvas.transform()).toContain('scale(2)');
    expect(canvas.transform()).toContain('translate(');
  });

  it('[REF-12.1] the selection ring marks the selected island', () => {
    const { canvas } = make({ selected: 2 });
    canvas.invalidate();
    expect(canvas.el.querySelector('[data-testid="island-selection"]')).not.toBeNull();
  });

  it('[REF-12.1] the grid overlay is placed on the viewed island and hidden at world zoom', () => {
    const { canvas } = make({ camera: { x: 0, y: 0, zoom: 0.5 } });
    const world = canvas.islandScreen(1);
    expect(world).not.toBeNull();
    expect(world?.size).toBeGreaterThan(0);
    expect(showsGrid(0.5)).toBe(false);
    expect(showsGrid(1)).toBe(true);
    expect(showsGrid(3)).toBe(true);
  });
});
