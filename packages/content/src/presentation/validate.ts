/**
 * Presentation-package validation (PIC-19): checks a presentation package's
 * documents against the presentation contract. Simulation-definition
 * collections are forbidden; mapping targets resolve against a supplied
 * simulation identifier set; localization keys must be syntactically valid;
 * missing localization entries and a missing global fallback warn (missing
 * nonessential assets produce warnings and fallbacks, not load failures).
 *
 * Source: PIC-19, PIC-6
 */
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import { isValidDefinitionId } from '../schemas/ids.js';
import { isDefinitionCollection } from '../schemas/collections.js';
import type { ParsedFile } from '../package/parse.js';
import type { JsonValue } from '../types.js';

/** Inputs that enable the reference and command checks when supplied. */
export interface PresentationValidationOptions {
  /** String IDs of every simulation definition, keyed by definition type. */
  readonly simulationIds?: ReadonlyMap<string, ReadonlySet<string>>;
  /** Known command type names for `controls` validation. */
  readonly knownCommands?: ReadonlySet<string>;
}

const asRecord = (value: JsonValue): { readonly [key: string]: JsonValue } | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as { readonly [key: string]: JsonValue })
    : null;

const asArray = (value: JsonValue | undefined): readonly JsonValue[] =>
  Array.isArray(value) ? (value as readonly JsonValue[]) : [];

const asString = (value: JsonValue | undefined): string | null =>
  typeof value === 'string' ? value : null;

const entryId = (value: JsonValue): string | null => asString(asRecord(value)?.['id']);

/**
 * Validates presentation package files, reporting `presentation_modifies_simulation`,
 * `presentation_target_missing`, `presentation_invalid_key`,
 * `presentation_key_missing`, `presentation_fallback_missing`, and
 * `presentation_invalid_command`.
 *
 * Source: PIC-19
 */
export function validatePresentationPackage(
  files: readonly ParsedFile[],
  options: PresentationValidationOptions = {},
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const localizationKeys = new Set<string>();
  let hasFallback = false;

  for (const file of files) {
    const document = asRecord(file.document);
    if (document === null) continue;
    for (const key of Object.keys(document)) {
      if (isDefinitionCollection(key)) {
        diagnostics.push(
          diag('presentation_modifies_simulation', {
            package: file.package,
            file: file.path,
            path: `/${key}`,
            args: { collection: key },
          }),
        );
        continue;
      }
      if (key === 'fallback') hasFallback = true;
      if (key === 'localization') {
        const entries = asRecord(document[key] ?? null)?.['entries'];
        const entryRecord = asRecord(entries ?? null);
        if (entryRecord !== null) {
          for (const entryKey of Object.keys(entryRecord)) {
            if (!isValidDefinitionId(entryKey)) {
              diagnostics.push(
                diag('presentation_invalid_key', {
                  package: file.package,
                  file: file.path,
                  path: `/localization/entries/${entryKey}`,
                  args: { key: entryKey },
                }),
              );
              continue;
            }
            localizationKeys.add(entryKey);
          }
        }
      }
    }
  }

  for (const file of files) {
    const document = asRecord(file.document);
    if (document === null) continue;
    const mappings = asArray(document['presentation_mapping']);
    mappings.forEach((entry, index) => {
      const record = asRecord(entry);
      if (record === null) return;
      const path = `/presentation_mapping/${index}`;
      const mappingId = entryId(entry);

      for (const key of Object.keys(record)) {
        if (key !== 'target_definition' && !key.endsWith('_key')) continue;
        const value = asString(record[key]);
        if (value === null) continue;
        if (!isValidDefinitionId(value)) {
          diagnostics.push(
            diag('presentation_invalid_key', {
              package: file.package,
              file: file.path,
              path: `${path}/${key}`,
              definition: mappingId,
              args: { key: value },
            }),
          );
        }
      }

      const target = asString(record['target_definition']);
      const simulationIds = options.simulationIds;
      const known =
        target !== null &&
        simulationIds !== undefined &&
        [...simulationIds.values()].some((set) => set.has(target));
      if (target !== null && simulationIds !== undefined && !known) {
        diagnostics.push(
          diag('presentation_target_missing', {
            package: file.package,
            file: file.path,
            path: `${path}/target_definition`,
            definition: mappingId,
            args: { target },
          }),
        );
      }

      if (localizationKeys.size > 0) {
        const localization = asRecord(record['localization'] ?? null);
        const nameKey = asString(localization?.['name_key'] ?? null);
        const descriptionKey = asString(localization?.['description_key'] ?? null);
        for (const [field, key] of [
          ['name_key', nameKey],
          ['description_key', descriptionKey],
        ] as const) {
          if (key === null || localizationKeys.has(key)) continue;
          diagnostics.push(
            diag('presentation_key_missing', {
              package: file.package,
              file: file.path,
              path: `${path}/localization/${field}`,
              definition: mappingId,
              severity: 'warning',
              args: { key },
            }),
          );
        }
        const visual = asRecord(record['visual'] ?? null);
        for (const field of ['model_key', 'icon_key']) {
          const key = asString(visual?.[field]);
          if (key === null || localizationKeys.has(key)) continue;
          diagnostics.push(
            diag('presentation_key_missing', {
              package: file.package,
              file: file.path,
              path: `${path}/visual/${field}`,
              definition: mappingId,
              severity: 'warning',
              args: { key },
            }),
          );
        }
      }

      const controls = asArray(record['controls']);
      controls.forEach((control, controlIndex) => {
        const command = asString(asRecord(control)?.['command'] ?? null);
        if (command === null) return;
        const known = options.knownCommands;
        if (known !== undefined && !known.has(command)) {
          diagnostics.push(
            diag('presentation_invalid_command', {
              package: file.package,
              file: file.path,
              path: `${path}/controls/${controlIndex}/command`,
              definition: mappingId,
              args: { command },
            }),
          );
        }
      });
    });
  }

  if (!hasFallback) {
    const first = files[0];
    diagnostics.push(
      diag('presentation_fallback_missing', {
        package: first?.package ?? null,
        file: first?.path ?? null,
        severity: 'warning',
        args: {},
      }),
    );
  }

  return diagnostics;
}
