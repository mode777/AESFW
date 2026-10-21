import { describe, expect, it } from 'vitest';
import { entityId } from '../ids/index.js';
import { createComponentStore } from './component-store.js';

describe('[TDS-8.2][INV-24] component store', () => {
  it('[TDS-8.2] store iteration is ascending by entity ID', () => {
    const store = createComponentStore('producer');
    store.set(entityId(2), { state: 'idle' });
    store.set(entityId(1), { state: 'busy' });
    expect(store.ids()).toEqual([1, 2]);
    expect(store.size()).toBe(2);
  });

  it('[TDS-8.2] tombstones are excluded from iteration', () => {
    const store = createComponentStore('producer');
    store.set(entityId(1), { state: 'idle' });
    store.set(entityId(2), { state: 'busy' });
    store.markRemoved(entityId(1));
    expect(store.ids()).toEqual([2]);
    expect(store.has(entityId(1))).toBe(false);
    expect(store.get(entityId(1))).toBeUndefined();
    expect(store.size()).toBe(1);
  });

  it('[TDS-8.2] reading an unknown component is an invariant violation', () => {
    const store = createComponentStore('producer');
    expect(() => store.getOrThrow(entityId(3))).toThrowError(/unknown_component/);
  });

  it('[INV-24] compaction drops tombstones without changing live iteration', () => {
    const store = createComponentStore('producer');
    store.set(entityId(1), { state: 'idle' });
    store.set(entityId(2), { state: 'busy' });
    store.markRemoved(entityId(1));
    store.compact();
    expect(store.ids()).toEqual([2]);
    expect(store.size()).toBe(1);
  });
});
