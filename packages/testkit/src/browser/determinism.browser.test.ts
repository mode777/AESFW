import { describe, expect, it } from 'vitest';
import { EMPTY_WORLD_HASHES } from './empty-world.hashes.js';
import { runEmptyWorldCheckpoints } from './empty-world-runner.js';

describe('[VER-8.2] browser determinism matrix', () => {
  it('[VER-8.2] Chromium reproduces the Node hashes', () => {
    expect(runEmptyWorldCheckpoints()).toEqual([...EMPTY_WORLD_HASHES]);
  });
});
