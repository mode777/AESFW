import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fileSystemIo, runCli } from './cli.js';
import type { CliIo } from './cli.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const scenarioPath = 'fixtures/scenarios/basic_loop.yaml';
const goldenPath = 'fixtures/scenarios/basic_loop.hashes.json';

const io: CliIo = {
  readPackage: (dir) => fileSystemIo().readPackage(resolve(repoRoot, dir)),
  readFile: (path) => fileSystemIo().readFile(resolve(repoRoot, path)),
};

interface Golden {
  readonly algorithm: string;
  readonly checkpoints: Readonly<Record<string, string>>;
}

describe('[VER-9.3][SCN-01] basic loop golden', () => {
  it('[SCN-01] the basic loop matches its golden hashes', () => {
    const result = runCli(['run', scenarioPath], io);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as {
      checkpoints: readonly { tick: number; hash: string }[];
      findings: readonly unknown[];
    };
    expect(report.findings).toEqual([]);
    const golden = JSON.parse(readFileSync(resolve(repoRoot, goldenPath), 'utf8')) as Golden;
    for (const checkpoint of report.checkpoints) {
      expect(golden.checkpoints[String(checkpoint.tick)]).toBe(checkpoint.hash);
    }
    expect(report.checkpoints).toHaveLength(Object.keys(golden.checkpoints).length);
  });
});
