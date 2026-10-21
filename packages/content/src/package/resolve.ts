/**
 * Manifest resolution (TDS-20.2 step 1, CONT-11.1, CONT-13.1): parse each
 * package's `package.yaml`, reject duplicate package IDs, and verify declared
 * dependency versions. Deterministic: sources are visited in order, manifests
 * are sorted by ascending ID, and dependencies are checked in declaration
 * order.
 *
 * Source: CONT-3, CONT-11.1, CONT-13.1, TDS-20.2
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';
import { Value } from '@sinclair/typebox/value';

import { diag } from '../diagnostics/diagnostics.js';
import { isValidRange, parseVersion, satisfies } from '../semver/semver.js';
import { DEFAULT_LOAD_OPTIONS } from '../types.js';
import type { LoadOptions } from '../types.js';
import { ManifestSchema } from './manifest.js';
import type { Manifest, ManifestData } from './manifest.js';
import { parseYamlStrict } from './parse.js';
import type { PackageSource } from './source.js';

const MANIFEST_FILE = 'package.yaml';

/** The outcome of resolving a set of package sources. */
export interface ManifestResolution {
  readonly manifests: readonly Manifest[];
  readonly diagnostics: readonly Diagnostic[];
}

const toManifest = (source: PackageSource, data: ManifestData): Manifest => ({
  source,
  file: MANIFEST_FILE,
  id: data.package.id,
  version: data.package.version,
  schemaVersion: data.package.schema_version,
  type: data.package.type,
  dependencies: (data.package.dependencies ?? []).map((dependency) => ({
    package: dependency.package,
    version: dependency.version,
  })),
  files: [...(data.package.files ?? [])],
  migrations: (data.package.migrations ?? []).map((migration) => ({
    from: migration.from,
    file: migration.file,
  })),
});

/**
 * Resolves manifests from `sources`, returning them in ascending package-ID
 * order with diagnostics rather than throwing. Reports `missing_manifest`,
 * `manifest_invalid`, `duplicate_package_id`, `missing_dependency`, and
 * `dependency_version_mismatch`.
 *
 * Source: CONT-3, CONT-11.1, CONT-13.1, TDS-20.2
 */
export function resolveManifests(
  sources: readonly PackageSource[],
  options: LoadOptions = DEFAULT_LOAD_OPTIONS,
): ManifestResolution {
  void options;
  const diagnostics: Diagnostic[] = [];
  const resolved: Manifest[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const text = source.read(MANIFEST_FILE);
    if (text === null) {
      diagnostics.push(
        diag('missing_manifest', { package: source.packageRoot, file: MANIFEST_FILE }),
      );
      continue;
    }
    const outcome = parseYamlStrict(text, { package: source.packageRoot, file: MANIFEST_FILE });
    diagnostics.push(...outcome.diagnostics);
    if (outcome.value === null) continue;
    if (!Value.Check(ManifestSchema, outcome.value)) {
      for (const error of Value.Errors(ManifestSchema, outcome.value)) {
        diagnostics.push(
          diag('manifest_invalid', {
            package: source.packageRoot,
            file: MANIFEST_FILE,
            path: error.path,
            args: { message: error.message },
          }),
        );
      }
      continue;
    }
    const data = outcome.value;
    if (seen.has(data.package.id)) {
      diagnostics.push(
        diag('duplicate_package_id', { package: data.package.id, file: MANIFEST_FILE }),
      );
      continue;
    }
    seen.add(data.package.id);
    resolved.push(toManifest(source, data));
  }

  const manifests = [...resolved].sort((left, right) => det.compareStrings(left.id, right.id));
  const byId = new Map(manifests.map((manifest) => [manifest.id, manifest] as const));
  for (const manifest of manifests) {
    for (const dependency of manifest.dependencies) {
      const target = byId.get(dependency.package);
      if (target === undefined) {
        diagnostics.push(
          diag('missing_dependency', {
            package: manifest.id,
            file: MANIFEST_FILE,
            args: { dependency: dependency.package },
          }),
        );
        continue;
      }
      if (!isValidRange(dependency.version)) {
        diagnostics.push(
          diag('manifest_invalid', {
            package: manifest.id,
            file: MANIFEST_FILE,
            args: { dependency: dependency.package, range: dependency.version },
          }),
        );
        continue;
      }
      const targetVersion = parseVersion(target.version);
      if (targetVersion === null || !satisfies(targetVersion, dependency.version)) {
        diagnostics.push(
          diag('dependency_version_mismatch', {
            package: manifest.id,
            file: MANIFEST_FILE,
            args: {
              dependency: dependency.package,
              range: dependency.version,
              version: target.version,
            },
          }),
        );
      }
    }
  }
  return { manifests, diagnostics };
}
