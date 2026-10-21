import { describe, expect, it } from 'vitest';

import { createMemorySource } from './source.js';

describe('[CONT-2][TDS-20.1] package source', () => {
  it('[TDS-20.1] a source lists and reads package files', () => {
    const source = createMemorySource('test.pkg', {
      'resources.yaml': 'resources: []\n',
      'package.yaml': 'package: {}\n',
    });
    expect(source.list()).toEqual(['package.yaml', 'resources.yaml']);
    expect(source.read('package.yaml')).toBe('package: {}\n');
    expect(source.packageRoot).toBe('test.pkg');
  });

  it('[TDS-20.1] reading an absent path returns null', () => {
    const source = createMemorySource('test.pkg', { 'package.yaml': 'package: {}\n' });
    expect(source.read('absent.yaml')).toBeNull();
  });
});
