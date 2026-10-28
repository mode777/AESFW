/**
 * The worker tick budget on R4 content at ×16 (REF-14.6, VER-14). The worker
 * runs up to sixteen ticks per animation frame, so the budget is the median
 * cost of one tick of a session on the full catalogue. The loop goes through
 * the same `advance` path the web worker uses.
 *
 * Source: REF-14.6, VER-14
 */
import { describe, expect, it } from 'vitest';

import { advance, createSession, instantiateWorldContent } from '@aesfw/app';
import type { ContentRegistry } from '@aesfw/content';

import { loadReferenceContent } from '../balance/load.js';

const ITERATIONS = 60;
const WARMUP = 10;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }
  return sorted[middle] ?? 0;
};

describe('[REF-14.6] worker tick budget', () => {
  it('[REF-14.6] R4 content ticks within the 2 ms median budget', () => {
    const loaded = loadReferenceContent();
    if (loaded.content === null) throw new Error('reference content failed to load');
    const registry = loaded.content.registry as ContentRegistry;
    const created = createSession(loaded.content, {
      sessionId: 'perf.r4',
      seed: [1, 2],
      tickDurationMs: 1000,
      world: 'ref.tier.world.prototype' as never,
      enabledModules: [],
      hashInterval: 0,
      journal: false,
      actor: 0 as never,
      actorId: 'owner.0',
      fog: false,
    });
    if (!created.ok) throw new Error('session creation failed');
    let session = created.value;
    instantiateWorldContent(session.world, registry, 'ref.tier.world.prototype');
    for (let tick = 0; tick < WARMUP; tick += 1) session = advance(session, 1).session;
    const samples: number[] = [];
    for (let tick = 0; tick < ITERATIONS; tick += 1) {
      const started = performance.now();
      session = advance(session, 1).session;
      samples.push(performance.now() - started);
    }
    const measured = median(samples);
    const entities = session.world.stores.get('definition').ids().length;
    // The measured values are recorded in the change design and the milestone log.
    expect(
      measured,
      `median ${measured.toFixed(3)} ms over ${entities} entities`,
    ).toBeLessThanOrEqual(2);
    expect(samples.length).toBe(ITERATIONS);
  }, 120_000);
});
