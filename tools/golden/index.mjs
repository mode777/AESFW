#!/usr/bin/env node
/**
 * `pnpm golden:update <scenario.yaml>` regenerates the golden hashes of a
 * scenario (VER-9.4). It is never run by CI.
 *
 * Source: VER-9.4
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fileSystemIo, runCli } from '../../packages/host-node/dist/cli.js';

const scenarioPath = process.argv[2];
if (scenarioPath === undefined) {
  process.stderr.write('usage: pnpm golden:update <scenario.yaml>\n');
  process.exit(1);
}

const result = runCli(['run', scenarioPath], fileSystemIo());
if (result.exitCode !== 0) {
  process.stderr.write(`${result.output}\n`);
  process.exit(1);
}
const report = JSON.parse(result.output);
const checkpoints = {};
for (const checkpoint of report.checkpoints) checkpoints[checkpoint.tick] = checkpoint.hash;
const golden = {
  algorithm: 'fnv1a64-canonical-json-v1',
  scenario: report.id,
  checkpoints,
};
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const goldenPath = join(repoRoot, scenarioPath.replace(/\.yaml$/, '.hashes.json'));
writeFileSync(goldenPath, `${JSON.stringify(golden, null, 2)}\n`);
process.stdout.write(`wrote ${goldenPath}\n`);
