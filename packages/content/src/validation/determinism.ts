/**
 * Determinism validation (CONT-11.8): rejects content that would inject
 * nondeterminism — wall-clock expressions, unseeded randomness,
 * platform-dependent numbers, embedded scripts, and optional modules that
 * redefine core definitions. Runs over raw definition documents per package
 * file, before composition, so findings name the package and file.
 *
 * Source: CONT-11.8
 */
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { Manifest } from '../package/manifest.js';
import type { ParsedFile } from '../package/parse.js';
import type { JsonValue } from '../types.js';

const WALL_CLOCK_OPERATORS: ReadonlySet<string> = new Set(['now', 'date', 'time', 'clock']);
const RANDOM_OPERATORS: ReadonlySet<string> = new Set(['random', 'rng', 'randint']);
const SCRIPT_MARKERS: readonly string[] = ['=>', 'function', 'eval(', 'new Date'];

const isRecord = (value: JsonValue): value is { readonly [key: string]: JsonValue } =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Validates determinism over the parsed files and resolved manifests of a
 * load, reporting `wall_clock_expression`, `unseeded_random`,
 * `platform_numeric`, `executable_script`, and `module_redefines_core`.
 *
 * Source: CONT-11.8
 */
export function validateDeterminism(
  files: readonly ParsedFile[],
  manifests: readonly Manifest[],
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const ownedIds = new Map<string, Set<string>>();
  for (const manifest of manifests) ownedIds.set(manifest.id, new Set<string>());

  const walkNumbers = (
    value: JsonValue,
    pkg: string,
    file: string,
    path: string,
    ids: Set<string>,
  ): void => {
    if (typeof value === 'number') {
      if (!Number.isSafeInteger(value)) {
        diagnostics.push(
          diag('platform_numeric', {
            package: pkg,
            file,
            path,
            args: { value: String(value) },
          }),
        );
      }
      return;
    }
    if (Array.isArray(value)) {
      (value as readonly JsonValue[]).forEach((entry, index) =>
        walkNumbers(entry, pkg, file, `${path}/${index}`, ids),
      );
      return;
    }
    if (isRecord(value)) {
      for (const key of Object.keys(value)) {
        walkNumbers(value[key] ?? null, pkg, file, `${path}/${key}`, ids);
      }
    }
  };

  const walkExpression = (
    value: JsonValue,
    pkg: string,
    file: string,
    path: string,
    conditionId: string,
  ): void => {
    if (typeof value === 'string') {
      if (SCRIPT_MARKERS.some((marker) => value.includes(marker))) {
        diagnostics.push(
          diag('executable_script', {
            package: pkg,
            file,
            path,
            definition: conditionId,
            args: {},
          }),
        );
      }
      return;
    }
    if (Array.isArray(value)) {
      (value as readonly JsonValue[]).forEach((entry, index) =>
        walkExpression(entry, pkg, file, `${path}/${index}`, conditionId),
      );
      return;
    }
    if (isRecord(value)) {
      for (const key of Object.keys(value)) {
        if (WALL_CLOCK_OPERATORS.has(key)) {
          diagnostics.push(
            diag('wall_clock_expression', {
              package: pkg,
              file,
              path: `${path}/${key}`,
              definition: conditionId,
              args: { operator: key },
            }),
          );
        }
        if (RANDOM_OPERATORS.has(key)) {
          diagnostics.push(
            diag('unseeded_random', {
              package: pkg,
              file,
              path: `${path}/${key}`,
              definition: conditionId,
              args: { operator: key },
            }),
          );
        }
        walkExpression(value[key] ?? null, pkg, file, `${path}/${key}`, conditionId);
      }
    }
  };

  for (const file of files) {
    const document = file.document;
    if (!isRecord(document)) continue;
    const ids = ownedIds.get(file.package);
    for (const key of Object.keys(document)) {
      const items = document[key];
      if (!Array.isArray(items)) continue;
      (items as readonly JsonValue[]).forEach((item, index) => {
        if (!isRecord(item) || typeof item['id'] !== 'string') return;
        ids?.add(item['id']);
        walkNumbers(item, file.package, file.path, `/${key}/${index}`, ids ?? new Set<string>());
        if (key === 'conditions') {
          walkExpression(
            item['expression'] ?? null,
            file.package,
            file.path,
            `/conditions/${index}/expression`,
            item['id'],
          );
        }
      });
    }
  }

  for (const manifest of manifests) {
    if (manifest.type !== 'optional_module') continue;
    for (const id of ownedIds.get(manifest.id) ?? []) {
      if (id.startsWith('framework.')) {
        diagnostics.push(
          diag('module_redefines_core', {
            package: manifest.id,
            definition: id,
            args: { reason: 'framework_namespace' },
          }),
        );
        continue;
      }
      for (const other of manifests) {
        if (other.id === manifest.id || other.type !== 'simulation_content') continue;
        if (ownedIds.get(other.id)?.has(id) === true) {
          diagnostics.push(
            diag('module_redefines_core', {
              package: manifest.id,
              definition: id,
              args: { reason: 'owned_elsewhere', owner: other.id },
            }),
          );
        }
      }
    }
  }
  return diagnostics;
}
