import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'playwright/test';

const TICKS = 20;

const scenarioYaml = [
  'scenario:',
  '  id: ref.tier.scenario.determinism',
  '  content:',
  '    packages: [reference/content/ref.tier]',
  '  setup:',
  '    seed: [0, 0]',
  '    tick_duration_ms: 1000',
  '    world: null',
  '  run:',
  `    ticks: ${TICKS}`,
  '    hash_interval: 1',
  '    invariants: false',
].join('\n');

test('[VER-8.2] browser and CLI hashes match', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'aesfw-e2e-'));
  const scenario = join(dir, 'r0.yaml');
  writeFileSync(scenario, scenarioYaml);
  const output = execFileSync('node', ['packages/host-node/dist/bin.js', 'run', scenario], {
    encoding: 'utf8',
  });
  const report = JSON.parse(output) as { checkpoints: Array<{ tick: number; hash: string }> };
  const cliHash = report.checkpoints[report.checkpoints.length - 1]?.hash ?? '';

  await page.goto('/');
  await page.keyboard.press('`');
  for (let index = 0; index < TICKS; index += 1) {
    await page.getByTestId('topbar-step').click();
  }
  await expect(page.getByTestId('debug-overlay')).toContainText(`hash ${cliHash}`);
});
