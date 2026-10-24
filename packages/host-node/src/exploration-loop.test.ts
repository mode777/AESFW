/**
 * SCN-05 golden: exploration and establishment through transported cargo
 * (VER-9.3). The scenario loads an establishment package at the owner's home,
 * explores the frontier location with a second unit, and establishes it.
 *
 * Source: VER-9.3, SCN-05, GDD-16
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fileSystemIo, runCli } from './cli.js';
import type { CliIo } from './cli.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const io: CliIo = {
  readPackage: (dir) => fileSystemIo().readPackage(resolve(repoRoot, dir)),
  readFile: (path) => fileSystemIo().readFile(resolve(repoRoot, path)),
};

interface Report {
  readonly checkpoints: readonly { tick: number; hash: string }[];
  readonly findings: readonly { tick: number; id: string; message: string }[];
  readonly events: readonly { readonly tick: number; readonly type: string }[];
}

interface Golden {
  readonly algorithm: string;
  readonly scenario: string;
  readonly checkpoints: Readonly<Record<string, string>>;
}

describe('[VER-9.3][SCN-05] exploration loop golden', () => {
  it('[SCN-05] the scenario runs with no findings and matches the golden', () => {
    const result = runCli(['run', 'fixtures/scenarios/exploration_loop.yaml'], io);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as Report;
    expect(report.findings).toEqual([]);

    const types = report.events.map((event) => event.type);
    expect(types).toContain('LocationDiscovered');
    expect(types).toContain('LocationEstablished');

    const golden = JSON.parse(
      readFileSync(resolve(repoRoot, 'fixtures/scenarios/exploration_loop.hashes.json'), 'utf8'),
    ) as Golden;
    expect(golden.algorithm).toBe('fnv1a64-canonical-json-v1');
    for (const [tick, hash] of Object.entries(golden.checkpoints)) {
      const checkpoint = report.checkpoints.find((entry) => entry.tick === Number(tick));
      expect(checkpoint?.hash).toBe(hash);
    }
  });

  it('[SCN-05] a repeat run produces byte-identical output', () => {
    const first = runCli(['run', 'fixtures/scenarios/exploration_loop.yaml'], io);
    const second = runCli(['run', 'fixtures/scenarios/exploration_loop.yaml'], io);
    expect(second.exitCode).toBe(0);
    expect(second.output).toBe(first.output);
  });
});
