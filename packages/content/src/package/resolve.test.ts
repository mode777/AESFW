import { describe, expect, it } from 'vitest';

import { createMemorySource } from './source.js';
import { resolveManifests } from './resolve.js';

interface ManifestSpec {
  readonly id: string;
  readonly version?: string;
  readonly type?: string;
  readonly dependencies?: readonly { readonly package: string; readonly version: string }[];
  readonly files?: readonly string[];
}

const manifestYaml = (spec: ManifestSpec): string => {
  const lines = [
    'package:',
    `  id: ${spec.id}`,
    `  version: ${spec.version ?? '1.0.0'}`,
    '  schema_version: 1',
    `  type: ${spec.type ?? 'simulation_content'}`,
  ];
  if (spec.dependencies !== undefined && spec.dependencies.length > 0) {
    lines.push('  dependencies:');
    for (const dependency of spec.dependencies) {
      lines.push(`    - package: ${dependency.package}`);
      lines.push(`      version: "${dependency.version}"`);
    }
  }
  if (spec.files !== undefined && spec.files.length > 0) {
    lines.push('  files:');
    for (const file of spec.files) lines.push(`    - ${file}`);
  }
  return `${lines.join('\n')}\n`;
};

const source = (root: string, spec: ManifestSpec) =>
  createMemorySource(root, { 'package.yaml': manifestYaml(spec) });

const first = <T>(values: readonly T[]): T => {
  const value = values[0];
  if (value === undefined) throw new Error('expected a first element');
  return value;
};

const codes = (diagnostics: readonly { readonly code: string }[]) =>
  diagnostics.map((diagnostic) => diagnostic.code);

describe('[CONT-3][CONT-11.1][CONT-12][CONT-13.1] manifest resolution', () => {
  it('[CONT-3] a valid manifest is parsed', () => {
    const result = resolveManifests([source('test.game', { id: 'test.game' })]);
    expect(result.diagnostics).toEqual([]);
    const manifest = first(result.manifests);
    expect(manifest.id).toBe('test.game');
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.type).toBe('simulation_content');
  });

  it('[CONT-3] an invalid manifest reports manifest_invalid', () => {
    const yaml = [
      'package:',
      '  id: test.game',
      '  version: 1.0.0',
      '  schema_version: 1',
      '',
    ].join('\n');
    const result = resolveManifests([createMemorySource('test.game', { 'package.yaml': yaml })]);
    expect(result.manifests).toEqual([]);
    expect(codes(result.diagnostics)).toContain('manifest_invalid');
  });

  it('[CONT-3] a source without a manifest reports missing_manifest', () => {
    const result = resolveManifests([createMemorySource('test.empty', {})]);
    expect(result.manifests).toEqual([]);
    expect(codes(result.diagnostics)).toEqual(['missing_manifest']);
  });

  it('[CONT-11.1] manifests are resolved in ascending ID order', () => {
    const result = resolveManifests([
      source('test.b', { id: 'test.b' }),
      source('test.a', { id: 'test.a' }),
    ]);
    expect(result.manifests.map((manifest) => manifest.id)).toEqual(['test.a', 'test.b']);
  });

  it('[CONT-11.1] duplicate package IDs are rejected', () => {
    const result = resolveManifests([
      source('test.first', { id: 'test.a', version: '1.0.0' }),
      source('test.second', { id: 'test.a', version: '2.0.0' }),
    ]);
    expect(codes(result.diagnostics)).toEqual(['duplicate_package_id']);
    expect(result.manifests).toHaveLength(1);
    expect(first(result.manifests).version).toBe('1.0.0');
  });

  it('[CONT-13.1] a satisfied dependency range resolves', () => {
    const result = resolveManifests([
      source('test.game', {
        id: 'test.game',
        dependencies: [{ package: 'test.core', version: '>=1.0.0 <2.0.0' }],
      }),
      source('test.core', { id: 'test.core', version: '1.4.0' }),
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('[CONT-11.1] a missing dependency reports missing_dependency', () => {
    const result = resolveManifests([
      source('test.game', {
        id: 'test.game',
        dependencies: [{ package: 'test.absent', version: '^1.0.0' }],
      }),
    ]);
    expect(codes(result.diagnostics)).toEqual(['missing_dependency']);
    expect(first(result.diagnostics).args['dependency']).toBe('test.absent');
  });

  it('[CONT-13.1] a mismatched dependency version reports dependency_version_mismatch', () => {
    const result = resolveManifests([
      source('test.game', {
        id: 'test.game',
        dependencies: [{ package: 'test.core', version: '^2.0.0' }],
      }),
      source('test.core', { id: 'test.core', version: '1.4.0' }),
    ]);
    expect(codes(result.diagnostics)).toEqual(['dependency_version_mismatch']);
  });

  it('[TDS-20.3] malformed input does not throw', () => {
    const sourceWithSequence = createMemorySource('test.seq', {
      'package.yaml': '- test.game\n- test.other\n',
    });
    expect(() => resolveManifests([sourceWithSequence])).not.toThrow();
    expect(codes(resolveManifests([sourceWithSequence]).diagnostics)).toContain('manifest_invalid');
  });

  it('[TDS-20.3] diagnostics carry package, file, and path', () => {
    const yaml = [
      'package:',
      '  id: test.game',
      '  version: 1.0.0',
      '  schema_version: 1',
      '',
    ].join('\n');
    const result = resolveManifests([createMemorySource('test.game', { 'package.yaml': yaml })]);
    const diagnostic = first(result.diagnostics);
    expect(diagnostic.package).toBe('test.game');
    expect(diagnostic.file).toBe('package.yaml');
    expect(diagnostic.path).not.toBeNull();
  });

  it('[CONT-11.2] options default to strict', () => {
    const input = [source('test.game', { id: 'test.game' })];
    const withDefaults = resolveManifests(input);
    const explicit = resolveManifests(input, { strictness: 'strict' });
    expect(withDefaults.manifests.map((manifest) => manifest.id)).toEqual(
      explicit.manifests.map((manifest) => manifest.id),
    );
    expect(withDefaults.diagnostics).toEqual(explicit.diagnostics);
  });
});
