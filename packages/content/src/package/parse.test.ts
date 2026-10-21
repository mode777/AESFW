import { describe, expect, it } from 'vitest';

import { parseFiles, parseYamlStrict } from './parse.js';
import type { Manifest } from './manifest.js';
import { createMemorySource } from './source.js';
import type { PackageSource } from './source.js';

const manifest = (source: PackageSource, files: readonly string[]): Manifest => ({
  source,
  file: 'package.yaml',
  id: 'test.game',
  version: '1.0.0',
  schemaVersion: 1,
  type: 'simulation_content',
  dependencies: [],
  files,
  migrations: [],
});

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[TDS-20.2][A7] strict YAML parsing', () => {
  it('[TDS-20.2] valid YAML files are parsed into documents', () => {
    const source = createMemorySource('test.game', {
      'resources.yaml': 'resources:\n  - id: test.r.a\n',
    });
    const result = parseFiles([manifest(source, ['resources.yaml'])]);
    expect(result.diagnostics).toEqual([]);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.document).toEqual({ resources: [{ id: 'test.r.a' }] });
  });

  it('[TDS-20.2] a YAML syntax error reports yaml_parse_error', () => {
    const source = createMemorySource('test.game', { 'bad.yaml': 'a: [1, 2\n' });
    const result = parseFiles([manifest(source, ['bad.yaml'])]);
    expect(codes(result.diagnostics)).toEqual(['yaml_parse_error']);
    expect(result.files).toEqual([]);
  });

  it('[TDS-20.2] duplicate mapping keys are rejected', () => {
    const source = createMemorySource('test.game', { 'dup.yaml': 'a: 1\na: 2\n' });
    const result = parseFiles([manifest(source, ['dup.yaml'])]);
    expect(codes(result.diagnostics)).toEqual(['yaml_duplicate_key']);
  });

  it('[TDS-20.2] merge keys are rejected', () => {
    const source = createMemorySource('test.game', {
      'merge.yaml': 'base: &b {x: 1}\nchild:\n  <<: *b\n',
    });
    const result = parseFiles([manifest(source, ['merge.yaml'])]);
    expect(codes(result.diagnostics)).toEqual(['yaml_merge_key']);
  });

  it('[TDS-20.2] custom tags are rejected', () => {
    const source = createMemorySource('test.game', { 'tag.yaml': 'a: !custom bar\n' });
    const result = parseFiles([manifest(source, ['tag.yaml'])]);
    expect(codes(result.diagnostics)).toEqual(['yaml_parse_error']);
  });

  it('[TDS-20.2] a declared file that is absent reports missing_file', () => {
    const source = createMemorySource('test.game', {});
    const result = parseFiles([manifest(source, ['absent.yaml'])]);
    expect(codes(result.diagnostics)).toEqual(['missing_file']);
  });

  it('[TDS-20.2] parsed files are ordered by ascending package and path', () => {
    const source = createMemorySource('test.game', {
      'b.yaml': 'b: 1\n',
      'a.yaml': 'a: 1\n',
    });
    const result = parseFiles([manifest(source, ['b.yaml', 'a.yaml'])]);
    expect(result.files.map((file) => file.path)).toEqual(['a.yaml', 'b.yaml']);
  });

  it('[TDS-20.2] parseYamlStrict returns the value and no diagnostics for valid input', () => {
    const outcome = parseYamlStrict('a: 1\n', { package: 'test.game', file: 'a.yaml' });
    expect(outcome.value).toEqual({ a: 1 });
    expect(outcome.diagnostics).toEqual([]);
  });
});
