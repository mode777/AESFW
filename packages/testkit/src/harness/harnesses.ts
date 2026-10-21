/**
 * Determinism harnesses (VER-8.1): clone-run (INV-17), double-run, and
 * save-continue (INV-18). Each returns a report as data; assertion helpers
 * wrap them with clear invariant codes.
 *
 * Source: VER-8.1, VER-5.2, INV-17, INV-18
 */
import {
  InvariantViolation,
  cloneWorld,
  decodeWorld,
  encodeWorld,
  hashWorld,
  step,
  world as core,
} from '@aesfw/core';
import type { Registry, TickInput } from '@aesfw/core';

type World = core.World;

/** The result of a determinism harness (VER-8.1). */
export interface DeterminismReport {
  readonly ok: boolean;
  readonly detail: string;
}

const plainInput: TickInput = { commands: [], options: { journal: false, hash: false } };

/**
 * Clones the world, steps both copies with the same input, and reports whether
 * their state, events, and outcomes match (INV-17).
 *
 * Source: VER-8.1, INV-17
 */
export function cloneRun(world: World, registry: Registry, input: TickInput): DeterminismReport {
  const clone = cloneWorld(world);
  const original = step(world, registry, input);
  const cloned = step(clone, registry, input);
  const hashOriginal = hashWorld(original.world, registry);
  const hashClone = hashWorld(cloned.world, registry);
  if (hashOriginal !== hashClone) {
    return { ok: false, detail: `state hash mismatch ${hashOriginal} != ${hashClone}` };
  }
  if (JSON.stringify(original.events) !== JSON.stringify(cloned.events)) {
    return { ok: false, detail: 'event stream mismatch' };
  }
  if (JSON.stringify(original.outcomes) !== JSON.stringify(cloned.outcomes)) {
    return { ok: false, detail: 'outcome stream mismatch' };
  }
  return { ok: true, detail: 'clone run matched' };
}

/** Options for `doubleRun`. */
export interface DoubleRunOptions {
  readonly interval?: number;
}

/**
 * Runs the scenario twice from fresh clones, recording hash checkpoints, and
 * reports whether the checkpoint sequences match.
 *
 * Source: VER-8.1
 */
export function doubleRun(
  world: World,
  registry: Registry,
  ticks: number,
  options: DoubleRunOptions = {},
): DeterminismReport {
  const interval = options.interval ?? 10;
  const runOnce = (): string[] => {
    const current = cloneWorld(world);
    const checkpoints: string[] = [];
    for (let tick = 1; tick <= ticks; tick += 1) {
      step(current, registry, plainInput);
      if (tick % interval === 0) checkpoints.push(hashWorld(current, registry));
    }
    return checkpoints;
  };

  const first = runOnce();
  const second = runOnce();
  if (first.length !== second.length) {
    return { ok: false, detail: 'checkpoint counts differ' };
  }
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return { ok: false, detail: `checkpoint ${index} differs` };
    }
  }
  return { ok: true, detail: `${first.length} checkpoints matched` };
}

/**
 * Runs the world uninterrupted, and a second copy saved at `saveAtTick` and
 * continued after a round-trip, then reports whether the final hashes match
 * (INV-18).
 *
 * Source: VER-8.1, INV-18
 */
export function saveContinue(
  world: World,
  registry: Registry,
  totalTicks: number,
  saveAtTick: number,
): DeterminismReport {
  const uninterrupted = cloneWorld(world);
  for (let tick = 0; tick < totalTicks; tick += 1) {
    step(uninterrupted, registry, plainInput);
  }

  const saved = cloneWorld(world);
  for (let tick = 0; tick < saveAtTick; tick += 1) {
    step(saved, registry, plainInput);
  }
  const decoded = decodeWorld(registry, encodeWorld(saved, registry));
  if (!decoded.ok) {
    return { ok: false, detail: 'save round-trip failed to decode' };
  }
  const continued = decoded.value;
  for (let tick = saveAtTick; tick < totalTicks; tick += 1) {
    step(continued, registry, plainInput);
  }

  const hashUninterrupted = hashWorld(uninterrupted, registry);
  const hashContinued = hashWorld(continued, registry);
  if (hashUninterrupted !== hashContinued) {
    return {
      ok: false,
      detail: `final hash mismatch ${hashUninterrupted} != ${hashContinued}`,
    };
  }
  return { ok: true, detail: 'save-continue matched' };
}

/**
 * Runs `run` twice and throws when the two hashes differ (VER-5.2).
 *
 * Source: VER-5.2
 */
export function expectHashStable(run: () => string): void {
  const first = run();
  const second = run();
  if (first !== second) {
    throw new InvariantViolation('hash_unstable', { first, second });
  }
}

/**
 * Throws when the two worlds' state hashes differ (VER-5.2).
 *
 * Source: VER-5.2
 */
export function expectSameState(a: World, b: World, registry: Registry): void {
  const hashA = hashWorld(a, registry);
  const hashB = hashWorld(b, registry);
  if (hashA !== hashB) {
    throw new InvariantViolation('state_mismatch', { a: hashA, b: hashB });
  }
}
