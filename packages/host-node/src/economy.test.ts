import { describe, expect, it } from 'vitest';
import { fileSystemIo, runCli } from './cli.js';
import type { CliIo } from './cli.js';

const io: CliIo = fileSystemIo();

interface Report {
  readonly checkpoints: readonly { tick: number; hash: string }[];
  readonly findings: readonly { tick: number; id: string; message: string }[];
}

describe('[GDD-7.5][GDD-20.2] economy income scenario', () => {
  it('[VER-9.2] the economy scenario runs with no findings and is deterministic', () => {
    const result = runCli(['run', 'fixtures/scenarios/economy_income.yaml'], io);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as Report;
    expect(report.findings).toEqual([]);
    expect(report.checkpoints.length).toBeGreaterThan(0);

    const repeat = runCli(['run', 'fixtures/scenarios/economy_income.yaml'], io);
    expect(repeat.exitCode).toBe(0);
    expect(repeat.output).toBe(result.output);
  });

  it('[CONT-6.3] the economy package validates strictly', () => {
    const result = runCli(['validate', 'fixtures/content/demo-economy', '--strict'], io);
    expect(result.exitCode).toBe(0);
  });
});
