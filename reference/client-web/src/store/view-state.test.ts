import { describe, expect, it } from 'vitest';
import { createViewState, toggleOverlay } from './view-state.js';

describe('[REF-12.2] grid overlay view state', () => {
  it('[REF-12.2] the connectivity key selects the connectivity overlay', () => {
    expect(toggleOverlay(null, 'c')).toBe('connectivity');
  });

  it('[REF-12.2] the suitability key selects the suitability overlay', () => {
    expect(toggleOverlay(null, 's')).toBe('suitability');
  });

  it('[REF-12.2] the same key clears the overlay', () => {
    expect(toggleOverlay('connectivity', 'c')).toBeNull();
  });

  it('[REF-12.2] the selected location is client-local state', () => {
    const view = createViewState();
    view.location.set(5);
    expect(view.location()).toBe(5);
  });
});
