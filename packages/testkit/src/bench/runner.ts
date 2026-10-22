/**
 * The pure benchmark runner (TDS-24, VER-14). Times `iterations` ticks with an
 * injected clock after a warm-up and reports the median and p95 tick time.
 *
 * Source: TDS-24, VER-14
 */
import { InvariantViolation, createWorld, instantiateWorld, step } from '@aesfw/core';
import type { TickInput } from '@aesfw/core';
import { defaultWorldPlan } from '@aesfw/content';
import type { CompiledContent, ContentRegistry } from '@aesfw/content';
import { instantiateContentEntities } from '@aesfw/app';
import type { Scenario } from '../scenario/types.js';
import type { BenchmarkOptions, BenchmarkResult } from './types.js';

const percentile = (samples: readonly number[], fraction: number): number => {
  if (samples.length === 0) return 0;
  const index = Math.min(samples.length - 1, Math.max(0, Math.ceil(fraction * samples.length) - 1));
  return samples[index] ?? 0;
};

/**
 * Runs a benchmark over a scenario (TDS-24).
 *
 * Source: TDS-24, VER-14
 */
export function runBenchmark(
  scenario: Scenario,
  content: CompiledContent,
  options: BenchmarkOptions,
): BenchmarkResult {
  const registry = content.registry as ContentRegistry;
  const created = createWorld(registry, {
    seed: [scenario.setup.seed[0], scenario.setup.seed[1]],
    tickDurationMs: scenario.setup.tickDurationMs,
    world: null,
    enabledModules: [],
  });
  if (!created.ok) {
    throw new InvariantViolation('benchmark_world_creation_failed', { scenario: scenario.id });
  }
  const world = created.value;
  instantiateWorld(world, defaultWorldPlan(registry).plan);
  instantiateContentEntities(world, registry);
  const input: TickInput = { commands: [], options: { journal: false, hash: false } };
  for (let tick = 0; tick < options.warmup; tick += 1) step(world, registry, input);
  const samples: number[] = [];
  for (let tick = 0; tick < options.iterations; tick += 1) {
    const started = options.now();
    step(world, registry, input);
    samples.push(options.now() - started);
  }
  samples.sort((left, right) => left - right);
  let entities = 0;
  for (const kind of world.stores.kinds) entities += world.stores.get(kind).size();
  return {
    scenario: scenario.id,
    entities,
    iterations: options.iterations,
    medianMs: percentile(samples, 0.5),
    p95Ms: percentile(samples, 0.95),
  };
}
