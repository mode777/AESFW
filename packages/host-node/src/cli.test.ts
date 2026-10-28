import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMemorySource } from '@aesfw/content';
import { describe, expect, it } from 'vitest';
import { fileSystemIo, runCli } from './cli.js';
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

  it('[PIC-19][TDS-21.2] a presentation package validates with --against', () => {
    const presentationManifest = [
      'package:',
      '  id: test.presentation',
      '  version: 1.0.0',
      '  schema_version: 1',
      '  type: presentation',
      '  files:',
      '    - presentation.yaml',
      '',
    ].join('\n');
    const presentation = [
      'presentation_mapping:',
      '  - target_definition: test.entity.absent',
      '    localization: { name_key: test.key.a }',
      'localization:',
      '  locale: en',
      '  entries: { test.key.a: A }',
      'fallback: { shape: box }',
      '',
    ].join('\n');
    const files: Record<string, string> = {
      'pkg/package.yaml': presentationManifest,
      'pkg/presentation.yaml': presentation,
      'sim/package.yaml': manifest,
      'sim/content.yaml': validContent,
    };
    const io: CliIo = {
      readPackage: (dir) =>
        createMemorySource(
          dir,
          Object.fromEntries(
            Object.entries(files)
              .filter(([path]) => path.startsWith(`${dir}/`))
              .map(([path, text]) => [path.slice(dir.length + 1), text]),
          ),
        ),
      readFile: (path) => files[path] ?? null,
    };
    const result = runCli(['validate', 'pkg', '--against', 'sim'], io);
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain('presentation_target_missing');
  });

  it('[PIC-19][TDS-21.2] a presentation mapping resolves against the simulation package', () => {
    const presentationManifest = [
      'package:',
      '  id: test.presentation',
      '  version: 1.0.0',
      '  schema_version: 1',
      '  type: presentation',
      '  files:',
      '    - presentation.yaml',
      '',
    ].join('\n');
    const presentation = [
      'presentation_mapping:',
      '  - target_definition: test.entity.builder',
      '    localization: { name_key: test.entity.builder }',
      '    display: { category_key: test.category.s1, sort_order: 10 }',
      'localization:',
      '  locale: en',
      '  entries: { test.entity.builder: Builder }',
      'fallback: { shape: box }',
      '',
    ].join('\n');
    const simContent = [
      validContent,
      'entity_definitions:',
      '  - id: test.entity.builder',
      '    components:',
      '      placement: { footprint: [1, 1] }',
      '',
    ].join('\n');
    const files: Record<string, string> = {
      'pkg/package.yaml': presentationManifest,
      'pkg/presentation.yaml': presentation,
      'sim/package.yaml': manifest,
      'sim/content.yaml': simContent,
    };
    const io: CliIo = {
      readPackage: (dir) =>
        createMemorySource(
          dir,
          Object.fromEntries(
            Object.entries(files)
              .filter(([path]) => path.startsWith(`${dir}/`))
              .map(([path, text]) => [path.slice(dir.length + 1), text]),
          ),
        ),
      readFile: (path) => files[path] ?? null,
    };
    const result = runCli(['validate', 'pkg', '--against', 'sim'], io);
    expect(result.output).not.toContain('presentation_target_missing');
    expect(result.exitCode).toBe(0);
  });

  it('[REF-8][TDS-21.2] run exports metrics CSV and fails on a failed expectation', () => {
    const scenarioWithExpectation = [
      'scenario:',
      '  id: test.scenario.metrics',
      '  requirements: [REF-8]',
      '  content:',
      '    packages: [pkg]',
      '  setup:',
      '    seed: [1, 2]',
      '    tick_duration_ms: 1000',
      '    world: null',
      '  run:',
      '    ticks: 2',
      '    hash_interval: 0',
      '    invariants: true',
      '    metrics_interval: 1',
      '  expect:',
      '    - at: 2',
      '      event_count: { type: CommandApplied }',
      '      greater: 100',
      '',
    ].join('\n');
    const written: Record<string, string> = {};
    const cliIo: CliIo = {
      readPackage: () =>
        createMemorySource('pkg', { 'package.yaml': manifest, 'content.yaml': validContent }),
      readFile: (path) => (path === 'scenario.yaml' ? scenarioWithExpectation : null),
      writeFile: (path, text) => {
        written[path] = text;
      },
    };
    const ok = runCli(
      ['run', 'scenario.yaml', '--ticks', '2', '--metrics-out', 'metrics.csv'],
      cliIo,
    );
    expect(written['metrics.csv']).toBeDefined();
    const lines = (written['metrics.csv'] ?? '').trim().split('\n');
    expect(lines[0]?.split(',').slice(0, 2)).toEqual(['tick', 'net_rate']);
    expect(lines).toHaveLength(4);
    expect(ok.exitCode).toBe(1);
    expect(ok.output).toContain('"ok": false');
  });

  it('[CONT-15][TDS-21.2] design-intent findings appear on demand', () => {
    const result = runCli(['validate', 'pkg', '--design-intent', 'warning'], io(validContent));
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('inactive_scarcities');
    expect(result.output).toContain('summary:');
  });

  it('[CONT-15][TDS-21.2] promoted economic findings fail', () => {
    const economicContent = [
      'resources:',
      '  - id: test.cap.missing',
      '    tags: [virtual, capability]',
      '    quantity: { precision: integer, scale: 1 }',
      '    storage: { policy: recomputed, scope: location }',
      '    transportable: false',
      'recipes:',
      '  - id: test.recipe.a',
      '    mode: batch',
      '    duration_ticks: 10',
      '    inputs: []',
      '    outputs: []',
      '    capability_requirements: [{ resource: test.cap.missing, quantity: 1 }]',
      '',
    ].join('\n');
    const promoted = runCli(
      ['validate', 'pkg', '--economic-diagnostics', 'error'],
      io(economicContent),
    );
    expect(promoted.exitCode).toBe(1);
    const warning = runCli(['validate', 'pkg'], io(economicContent));
    expect(warning.exitCode).toBe(0);
    expect(warning.output).toContain('capability_deficit');
  });

  it('[CONT-15][TDS-21.2] defaults are unchanged and the JSON report carries summaries', () => {
    const plain = runCli(['validate', 'pkg'], io(validContent));
    expect(plain.output).not.toContain('inactive_scarcities');
    const json = runCli(['validate', 'pkg', '--format', 'json'], io(validContent));
    const report = JSON.parse(json.output) as {
      diagnostics: { code: string }[];
      summary: { errors: number; warnings: number };
    };
    expect(report.summary).toEqual({ errors: 0, warnings: 0 });
    expect(Array.isArray(report.diagnostics)).toBe(true);
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

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const realIo: CliIo = {
  readPackage: (dir) => fileSystemIo().readPackage(resolve(repoRoot, dir)),
  readFile: (path) => fileSystemIo().readFile(resolve(repoRoot, path)),
};

describe('[TDS-21.2] aesfw bench', () => {
  it('[TDS-21.2] the bench command prints JSON', () => {
    const result = runCli(
      ['bench', '--scenario', 'bench_small', '--iterations', '5', '--warmup', '1'],
      realIo,
    );
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(result.output) as {
      scenario: string;
      iterations: number;
      medianMs: number;
      p95Ms: number;
    };
    expect(parsed.scenario).toBe('bench.small');
    expect(parsed.iterations).toBe(5);
  });
});
