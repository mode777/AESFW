/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EMPTY_WORLD_HASHES } from './empty-world.hashes.js';
import { runEmptyWorldCheckpoints } from './empty-world-runner.js';

describe('[VER-8.2][VER-9.4] empty-world Node reference', () => {
  it('[VER-8.2] the runner records the requested checkpoints', () => {
    const hashes = runEmptyWorldCheckpoints();
    expect(hashes).toHaveLength(10);
    for (const hash of hashes) {
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it('[VER-8.2][VER-9.4] the Node run matches the golden', () => {
    expect(runEmptyWorldCheckpoints()).toEqual([...EMPTY_WORLD_HASHES]);
  });

  it('[VER-15.3] CI runs the browser determinism stage', () => {
    const ci = readFileSync(
      join(import.meta.dirname, '../../../../.github/workflows/ci.yml'),
      'utf8',
    );
    expect(ci).toContain('pnpm test:browser');
  });
});
