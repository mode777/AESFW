import { createMemorySource } from '@aesfw/content';
import { describe, expect, it } from 'vitest';
import { runCli } from './cli.js';
import type { CliIo } from './cli.js';

const manifest = [
  'package:',
  '  id: test.game',
  '  version: 1.0.0',
  '  schema_version: 1',
  '  type: simulation_content',
  '  files:',
  '    - content.yaml',
  '',
].join('\n');

const validContent = [
  'location_templates:',
  '  - id: test.location.a',
  '    spatial_policy: framework.spatial.abstract_capacity',
  '    spatial_parameters: { total_capacity: 100 }',
  '    inventories:',
  '      - id: shared',
  '        capacity: { mode: total, quantity: 1000 }',
  '        access_policy: framework.inventory.shared_location',
  '    activation: { initial: true }',
  '',
].join('\n');

const invalidContent = [
  'recipes:',
  '  - id: test.recipe.a',
  '    mode: batch',
  '    duration_ticks: 10',
  '    inputs: [{ resource: test.r.absent, quantity: 1 }]',
  '    outputs: []',
  '',
].join('\n');

const scenarioYaml = [
  'scenario:',
  '  id: test.scenario.cli',
  '  requirements: [SCN-01]',
  '  content:',
  '    packages: [pkg]',
  '  setup:',
  '    seed: [1, 2]',
  '    tick_duration_ms: 1000',
  '    world: null',
  '  run:',
  '    ticks: 4',
  '    hash_interval: 2',
  '    invariants: true',
  '',
].join('\n');

const io = (contentYaml: string): CliIo => ({
  readPackage: () =>
    createMemorySource('pkg', { 'package.yaml': manifest, 'content.yaml': contentYaml }),
  readFile: (path) => (path === 'scenario.yaml' ? scenarioYaml : null),
});

describe('[TDS-21.2] aesfw CLI', () => {
  it('[TDS-21.2] a valid package exits zero', () => {
    const result = runCli(['validate', 'pkg'], io(validContent));
    expect(result.exitCode).toBe(0);
  });

  it('[TDS-21.2] an invalid package exits non-zero', () => {
    const result = runCli(['validate', 'pkg'], io(invalidContent));
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('unresolved');
  });

  it('[TDS-21.2] a scenario runs from the CLI', () => {
    const result = runCli(['run', 'scenario.yaml'], io(validContent));
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as { checkpoints: readonly { tick: number }[] };
    expect(report.checkpoints.map((checkpoint) => checkpoint.tick)).toEqual([2, 4]);
  });

  it('[TDS-21.2] ticks override the scenario', () => {
    const result = runCli(
      ['run', 'scenario.yaml', '--ticks', '1', '--hash-interval', '1'],
      io(validContent),
    );
    const report = JSON.parse(result.output) as { checkpoints: readonly { tick: number }[] };
    expect(report.checkpoints.map((checkpoint) => checkpoint.tick)).toEqual([1]);
  });
});
