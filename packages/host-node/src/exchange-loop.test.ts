/**
 * SCN-06 golden: exchange trade and elasticity (VER-9.3). A transport unit
 * buys from the exchange (raising the purchase price), sells in repeated
 * steps (lowering the sale price), and sells again after the price has
 * recovered to its base.
 *
 * Source: VER-9.3, SCN-06, GDD-17.3, GDD-17.4
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
  readonly events: readonly {
    readonly tick: number;
    readonly type: string;
    readonly payload: { readonly price?: number; readonly direction?: string };
  }[];
}

interface Golden {
  readonly algorithm: string;
  readonly scenario: string;
  readonly checkpoints: Readonly<Record<string, string>>;
}

describe('[VER-9.3][SCN-06] exchange golden', () => {
  it('[SCN-06] the scenario runs with no findings and matches the golden', () => {
    const result = runCli(['run', 'fixtures/scenarios/exchange_loop.yaml'], io);
    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.output) as Report;
    expect(report.findings).toEqual([]);

    const prices = report.events
      .filter((event) => event.type === 'Traded')
      .map((event) => event.payload.price);
    expect(prices).toEqual([12000, 13200, 14400, 15600, 8000, 7200, 6400, 8000]);

    const golden = JSON.parse(
      readFileSync(resolve(repoRoot, 'fixtures/scenarios/exchange_loop.hashes.json'), 'utf8'),
    ) as Golden;
    expect(golden.algorithm).toBe('fnv1a64-canonical-json-v1');
    expect(golden.scenario).toBe('test.scenario.exchange_loop');
    for (const [tick, hash] of Object.entries(golden.checkpoints)) {
      const checkpoint = report.checkpoints.find((entry) => entry.tick === Number(tick));
      expect(checkpoint?.hash).toBe(hash);
    }
  });

  it('[SCN-06] a repeat run produces byte-identical output', () => {
    const first = runCli(['run', 'fixtures/scenarios/exchange_loop.yaml'], io);
    const second = runCli(['run', 'fixtures/scenarios/exchange_loop.yaml'], io);
    expect(second.exitCode).toBe(0);
    expect(second.output).toBe(first.output);
  });
});
