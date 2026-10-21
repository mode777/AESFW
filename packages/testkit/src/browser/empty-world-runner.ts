/**
 * Browser-safe empty-world replay runner (VER-8.2). Builds a world from an
 * empty registry, steps it, and records state-hash checkpoints. It uses only
 * pure `@aesfw/core` exports and no ambient API, so it runs unchanged in Node
 * and in a browser.
 *
 * Source: VER-8.2
 */
import { createEmptyRegistry, createWorld, hashWorld, step } from '@aesfw/core';
import type { Registry } from '@aesfw/core';

/** Steps an empty world and returns the hash checkpoint list. */
export function runEmptyWorldCheckpoints(ticks = 10000, interval = 1000): readonly string[] {
  const registry: Registry = createEmptyRegistry();
  const created = createWorld(registry, {
    seed: [1, 2],
    tickDurationMs: 1000,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) {
    throw new Error('createWorld returned an error');
  }
  const world = created.value;
  const hashes: string[] = [];
  for (let current = 1; current <= ticks; current += 1) {
    step(world, registry, { commands: [], options: { journal: false, hash: false } });
    if (current % interval === 0) hashes.push(hashWorld(world, registry));
  }
  return hashes;
}
