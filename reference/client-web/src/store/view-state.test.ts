import { describe, expect, it } from 'vitest';
import { createViewState, drawerAction, nextMode, toggleOverlay } from './view-state.js';

describe('[REF-12.2] grid overlay view state', () => {
  it('[REF-12.2] the connectivity key selects the connectivity overlay', () => {
    expect(toggleOverlay(null, 'c')).toBe('connectivity');
  });

  it('[REF-12.2] the suitability key selects the suitability overlay', () => {
    expect(toggleOverlay(null, 's')).toBe('suitability');
  });

  it('[REF-12.2] the throughput key selects the throughput overlay', () => {
    expect(toggleOverlay(null, 't')).toBe('throughput');
  });

  it('[REF-12.2] the same key clears the overlay', () => {
    expect(toggleOverlay('connectivity', 'c')).toBeNull();
    expect(toggleOverlay('throughput', 'T')).toBeNull();
  });

  it('[REF-12.2] the selected location is client-local state', () => {
    const view = createViewState();
    view.location.set(5);
    expect(view.location()).toBe(5);
  });
});

describe('[REF-13.1][REF-13.2] placement mode view state', () => {
  it('[REF-13.1][REF-13.2] the build key enters place mode', () => {
    expect(nextMode('inspect', 'b')).toBe('place');
  });

  it('[REF-13.1][REF-13.2] Escape returns to inspect mode', () => {
    expect(nextMode('place', 'Escape')).toBe('inspect');
  });

  it('[REF-13.1][REF-13.2] an unrelated key leaves the mode unchanged', () => {
    expect(nextMode('place', 'x')).toBe('place');
  });

  it('[REF-13.1][REF-13.2] the placement cursor is client-local state', () => {
    const view = createViewState();
    view.placement.set({
      definitionId: 'test.entity.a',
      position: [1, 2],
      orientation: 0,
      result: null,
    });
    expect(view.placement().definitionId).toBe('test.entity.a');
  });
});

describe('[REF-13.4] drawerAction', () => {
  it('[REF-13.4] the economy key toggles the drawer', () => {
    expect(drawerAction(null, 'e')).toBe('economy');
    expect(drawerAction('economy', 'E')).toBeNull();
  });

  it('[REF-13.4] the planning key toggles the drawer', () => {
    expect(drawerAction(null, 'p')).toBe('planning');
    expect(drawerAction('planning', 'P')).toBeNull();
    expect(drawerAction('economy', 'p')).toBe('planning');
  });

  it('[REF-13.4] other keys leave the drawer unchanged', () => {
    expect(drawerAction('economy', 'b')).toBe('economy');
  });
});

describe('[REF-13.2] progression keys', () => {
  it('[REF-13.2] V toggles the population drawer', () => {
    expect(drawerAction(null, 'v')).toBe('population');
    expect(drawerAction('population', 'v')).toBeNull();
  });

  it('[REF-12.2] O toggles the coverage overlay', () => {
    expect(toggleOverlay(null, 'o')).toBe('coverage');
    expect(toggleOverlay('coverage', 'o')).toBeNull();
  });
});
