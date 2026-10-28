/**
 * Loads the reference content package from disk exactly as the CLI does, so
 * the balance corpus runs the same data a host would.
 *
 * Source: REF-8, REF-5
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createMemorySource, loadContent, parseYamlStrict } from '@aesfw/content';
import type { LoadResult } from '@aesfw/content';

const packageDir = fileURLToPath(new URL('../../ref.tier/', import.meta.url));

const read = (name: string): string => readFileSync(`${packageDir}${name}`, 'utf8');

/** Reads the manifest's file list in order. */
const packageFiles = (): readonly string[] => {
  const manifest = parseYamlStrict(read('package.yaml'), {
    package: 'ref.tier',
    file: 'package.yaml',
  }).value as { readonly package?: { readonly files?: readonly string[] } };
  const files = manifest.package?.files;
  if (files === undefined) throw new Error('ref.tier package.yaml declares no files');
  return files;
};

/** Loads `ref.tier` strictly, as `aesfw run` does. */
export function loadReferenceContent(): LoadResult {
  const source = createMemorySource('ref.tier', {
    'package.yaml': read('package.yaml'),
    ...Object.fromEntries(packageFiles().map((name) => [name, read(name)])),
  });
  return loadContent([source], { strictness: 'strict' });
}
