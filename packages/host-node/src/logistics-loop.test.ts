import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fileSystemIo, runCli } from './cli.js';
import type { CliIo } from './cli.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scenarioPath = 'fixtures/scenarios/logistics_loop.yaml';
const goldenPath = 'fixtures/scenarios/logistics_loop.hashes.json';

const io: CliIo = {
  readPackage: (dir) => fileSystemIo().readPackage(resolve(repoRoot, dir)),
  readFile: (path) => fileSystemIo().readFile(resolve(repoRoot, path)),
};

interface Report {
  readonly checkpoints: readonly { tick: number; hash: string }[];
  readonly events: readonly { readonly type: string }[];
  readonly findings: readonly { tick: number; id: string; message: string }[];
}

interface Golden {
  readonly algorithm: string;
  readonly checkpoints: Readonly<Record<string, string>>;
}

describe('[VER-9.3][SCN-02][GDD-23.2] logistics loop golden', () => {
  it('[SCN-02] a resource moves between two locations and matches its golden', () => {
    const result = runCli(['run', scenarioPath], io);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as Report;
    expect(report.findings).toEqual([]);
    const loaded = report.events.filter((event) => event.type === 'TransportLoaded');
    const unloaded = report.events.filter((event) => event.type === 'TransportUnloaded');
    expect(loaded.length).toBeGreaterThan(0);
    expect(unloaded.length).toBeGreaterThan(0);

    const golden = JSON.parse(readFileSync(resolve(repoRoot, goldenPath), 'utf8')) as Golden;
    expect(golden.algorithm).toBe('fnv1a64-canonical-json-v1');
    for (const checkpoint of report.checkpoints) {
      expect(golden.checkpoints[String(checkpoint.tick)]).toBe(checkpoint.hash);
    }
    expect(report.checkpoints).toHaveLength(Object.keys(golden.checkpoints).length);
  });

  it('[SCN-02] a second run reproduces the same checkpoint sequence', () => {
    const first = runCli(['run', scenarioPath], io);
    const second = runCli(['run', scenarioPath], io);
    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(second.output).toBe(first.output);
  });
});
