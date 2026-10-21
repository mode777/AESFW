import { describe, expect, it } from 'vitest';
import { content, expectContentOk } from '../harness/content-builder.js';
import { parseScenario } from './parse.js';
import { runScenario } from './runner.js';

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

const scenarioValue = {
  id: 'test.scenario.basic',
  requirements: ['SCN-01'],
  content: { packages: [] },
  setup: { seed: [1, 2], tick_duration_ms: 1000, world: null },
  run: { ticks: 10, hash_interval: 5, invariants: true },
};

describe('[VER-9.1] scenario parsing', () => {
  it('[VER-9.1] a well-formed scenario parses', () => {
    const result = parseScenario(scenarioValue);
    expect(result.scenario?.id).toBe('test.scenario.basic');
    expect(result.scenario?.run.ticks).toBe(10);
  });

  it('[VER-9.1] a malformed scenario reports errors', () => {
    const result = parseScenario({ run: {} });
    expect(result.scenario).toBeNull();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('[VER-9.2] scenario runner', () => {
  it('[VER-9.2] a scenario runs and records checkpoints', () => {
    const parsed = parseScenario(scenarioValue).scenario;
    if (parsed === null) throw new Error('parse failed');
    const report = runScenario(parsed, compiled());
    expect(report.checkpoints.map((checkpoint) => checkpoint.tick)).toEqual([5, 10]);
    expect(report.findings).toEqual([]);
  });

  it('[VER-9.2] the same scenario runs deterministically', () => {
    const parsed = parseScenario(scenarioValue).scenario;
    if (parsed === null) throw new Error('parse failed');
    const first = runScenario(parsed, compiled());
    const second = runScenario(parsed, compiled());
    expect(first.checkpoints).toEqual(second.checkpoints);
  });
});
