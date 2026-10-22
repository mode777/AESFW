import { describe, expect, it } from 'vitest';
import { content, expectContentOk } from '../harness/content-builder.js';
import { parseScenario } from '../scenario/parse.js';
import { runBenchmark } from './runner.js';

const compiled = () =>
  expectContentOk(
    content()
      .define('location_templates', {
        id: 'test.location.a',
        spatial_policy: 'framework.spatial.abstract_capacity',
        spatial_parameters: { total_capacity: 100 },
        inventories: [
          {
            id: 'shared',
            capacity: { mode: 'total', quantity: 1000 },
            access_policy: 'framework.inventory.shared_location',
          },
        ],
        activation: { initial: true },
      })
      .build(),
  );

const scenario = () => {
  const parsed = parseScenario({
    id: 'bench.test',
    content: { packages: [] },
    setup: { seed: [1, 2], tick_duration_ms: 1000, world: null },
    run: { ticks: 10, hash_interval: 0, invariants: false },
  }).scenario;
  if (parsed === null) throw new Error('parse failed');
  return parsed;
};

describe('[TDS-24][VER-14] benchmark runner', () => {
  it('[VER-14] the runner reports the median and p95', () => {
    let counter = 0;
    const now = (): number => {
      counter += 1;
      return counter;
    };
    const result = runBenchmark(scenario(), compiled(), { iterations: 100, warmup: 0, now });
    expect(result.iterations).toBe(100);
    expect(result.medianMs).toBe(1);
    expect(result.p95Ms).toBe(1);
    expect(result.entities).toBeGreaterThan(0);
  });

  it('[VER-14] the warm-up is not timed', () => {
    let calls = 0;
    const now = (): number => {
      calls += 1;
      return calls;
    };
    runBenchmark(scenario(), compiled(), { iterations: 10, warmup: 5, now });
    expect(calls).toBe(20);
  });
});
