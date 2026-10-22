/**
 * A tiny signal/computed primitive (REF-14.1, REF-14.2). The client is plain
 * DOM with no framework; this is the reactive core the views subscribe to.
 *
 * Source: REF-14.1, REF-14.2
 */

/** A read-only reactive value. */
export interface ReadonlySignal<T> {
  (): T;
  subscribe(listener: () => void): () => void;
}

/** A mutable reactive value. */
export interface Signal<T> extends ReadonlySignal<T> {
  set(value: T): void;
}

/** A computed value derived from other signals. */
export type Computed<T> = ReadonlySignal<T>;

type Tracker = (subscribe: (listener: () => void) => () => void) => void;

let activeTracker: Tracker | null = null;

/**
 * Creates a mutable signal (REF-14.2).
 *
 * Source: REF-14.2
 */
export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  const get = (() => {
    if (activeTracker !== null) activeTracker((listener) => get.subscribe(listener));
    return value;
  }) as Signal<T>;
  get.set = (next: T) => {
    if (Object.is(next, value)) return;
    value = next;
    for (const listener of [...listeners]) listener();
  };
  get.subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return get;
}

/**
 * Creates a lazily recomputed value (REF-14.2). It tracks the signals read
 * during evaluation and recomputes on the next read after any of them changes.
 *
 * Source: REF-14.2
 */
export function computed<T>(fn: () => T): Computed<T> {
  const listeners = new Set<() => void>();
  let cleanups: Array<() => void> = [];
  let cached: T | undefined;
  let dirty = true;

  const invalidate = (): void => {
    if (dirty) return;
    dirty = true;
    for (const listener of [...listeners]) listener();
  };

  const evaluate = (): void => {
    for (const cleanup of cleanups) cleanup();
    cleanups = [];
    const previous = activeTracker;
    activeTracker = (subscribe) => cleanups.push(subscribe(invalidate));
    try {
      cached = fn();
    } finally {
      activeTracker = previous;
    }
    dirty = false;
  };

  const get = (() => {
    if (dirty) evaluate();
    return cached as T;
  }) as Computed<T>;
  get.subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  return get;
}
