/**
 * Scenario expectation evaluation (VER-9.1) and metrics rows (REF-8). The
 * fixtures are the same files the CLI reads, so these tests and `aesfw run`
 * exercise one code path.
 *
 * Source: VER-9.1, REF-8
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { createMemorySource, loadContent, parseYamlStrict } from '@aesfw/content';
import type { CompiledContent } from '@aesfw/content';
import { compare, metricsCells, metricsHeader, parseScenario, runScenario } from './index.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));

const read = (path: string): string => readFileSync(`${root}${path}`, 'utf8');

const content = (): CompiledContent => {
  const manifest = parseYamlStrict(read('fixtures/content/demo-basic-loop/package.yaml'), {
    package: 'demo-basic-loop',
    file: 'package.yaml',
  }).value as { readonly package: { readonly files: readonly string[] } };
  const files = {
    'package.yaml': read('fixtures/content/demo-basic-loop/package.yaml'),
    ...Object.fromEntries(
      manifest.package.files.map((name) => [
        name,
        read(`fixtures/content/demo-basic-loop/${name}`),
      ]),
    ),
  };
  const loaded = loadContent([createMemorySource('fixtures/content/demo-basic-loop', files)], {
    strictness: 'strict',
  });
  if (loaded.content === null) throw new Error('fixture content failed to load');
  return loaded.content;
};

const scenario = (name: string): ReturnType<typeof parseScenario> =>
  parseScenario(
    (
      parseYamlStrict(read(`fixtures/scenarios/${name}.yaml`), {
        package: 'fixtures/scenarios',
        file: name,
      }).value as { readonly scenario: unknown }
    ).scenario,
  );

describe('[VER-9.1] expectation evaluation', () => {
  it('[VER-9.1] a passing fixture reports every expectation as satisfied', () => {
    const parsed = scenario('expectations');
    if (parsed.scenario === null) throw new Error(parsed.errors.join(','));
    const report = runScenario(parsed.scenario, content());
    expect(report.findings).toEqual([]);
    expect(report.expectations).toHaveLength(4);
    expect(report.expectations.map((entry) => entry.tick)).toEqual([0, 60, 120, 120]);
    expect(report.expectations.filter((entry) => !entry.ok)).toEqual([]);
  });

  it('[VER-9.1] a failing fixture reports a failed expectation without aborting', () => {
    const parsed = scenario('expectations_failing');
    if (parsed.scenario === null) throw new Error(parsed.errors.join(','));
    const report = runScenario(parsed.scenario, content());
    expect(report.expectations).toHaveLength(1);
    const [entry] = report.expectations;
    expect(entry?.ok).toBe(false);
    expect(entry?.target).toBe('population:demo.population.tier_1');
    expect(entry?.comparator).toBe('less');
    expect(entry?.actual).not.toBeNull();
  });

  it('[VER-9.1] every comparator is exact', () => {
    expect(compare(2, 'greater', 1)).toBe(true);
    expect(compare(1, 'greater', 1)).toBe(false);
    expect(compare(1, 'greater_equal', 1)).toBe(true);
    expect(compare(0, 'less', 1)).toBe(true);
    expect(compare(1, 'less_equal', 1)).toBe(true);
    expect(compare(1, 'equal', 1)).toBe(true);
    expect(compare(1, 'equal', 2)).toBe(false);
  });

  it('[VER-9.1] an unresolved expectation is a failure, not an exception', () => {
    const parsed = parseScenario({
      id: 'test.scenario.unresolved',
      content: { packages: [] },
      setup: { seed: [1, 2], tick_duration_ms: 1000, world: null },
      run: { ticks: 0, hash_interval: 0, invariants: false },
      expect: [{ at: 0, metric: { satisfaction: { entity: '@demo.entity.absent#1' } }, equal: 1 }],
    }).scenario;
    if (parsed === null) throw new Error('parse failed');
    const report = runScenario(parsed, content());
    expect(report.expectations).toHaveLength(1);
    expect(report.expectations[0]?.actual).toBeNull();
    expect(report.expectations[0]?.ok).toBe(false);
  });
});

describe('[REF-8] metrics rows', () => {
  it('[REF-8] metrics rows are sampled at the configured interval', () => {
    const parsed = scenario('expectations');
    if (parsed.scenario === null) throw new Error(parsed.errors.join(','));
    const report = runScenario(parsed.scenario, content());
    expect(report.metrics.map((row) => row.tick)).toEqual([0, 60, 120]);
  });

  it('[REF-8] metrics rows use base units and permille', () => {
    const parsed = scenario('expectations');
    if (parsed.scenario === null) throw new Error(parsed.errors.join(','));
    const report = runScenario(parsed.scenario, content());
    const last = report.metrics.at(-1);
    expect(last?.population['demo.population.tier_1']).toBeGreaterThan(0);
    for (const value of Object.values(last?.satisfaction ?? {})) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1000);
    }
    expect(Object.keys(last?.balance ?? {})).toEqual([]);
  });

  it('[REF-8] the same scenario yields identical metrics on a second run', () => {
    const parsed = scenario('expectations');
    if (parsed.scenario === null) throw new Error(parsed.errors.join(','));
    const first = runScenario(parsed.scenario, content());
    const second = runScenario(parsed.scenario, content());
    expect(first.metrics).toEqual(second.metrics);
    expect(first.expectations).toEqual(second.expectations);
  });

  it('[REF-8] the CSV header is stable and matches the row width', () => {
    const parsed = scenario('expectations');
    if (parsed.scenario === null) throw new Error(parsed.errors.join(','));
    const report = runScenario(parsed.scenario, content());
    const header = metricsHeader(report.metrics);
    expect(header.slice(0, 2)).toEqual(['tick', 'net_rate']);
    for (const row of report.metrics) {
      expect(metricsCells(row, header)).toHaveLength(header.length);
    }
  });
});
