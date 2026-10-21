/**
 * Strict YAML parsing for package files (TDS-20.2 step 3, A7). No custom tags,
 * no merge keys, no duplicate mapping keys. Failures are diagnostics, never
 * exceptions. The parsed documents are canonical JSON data.
 *
 * Source: TDS-20.2, A7, CONT-3
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';
import { parseDocument } from 'yaml';

import { diag } from '../diagnostics/diagnostics.js';
import { DEFAULT_LOAD_OPTIONS } from '../types.js';
import type { JsonValue, LoadOptions } from '../types.js';
import type { Manifest } from './manifest.js';

/** The context a YAML diagnostic points at. */
export interface YamlContext {
  readonly package: string | null;
  readonly file: string | null;
}

/** The outcome of parsing one YAML document. */
export interface YamlParseOutcome {
  readonly value: JsonValue | null;
  readonly diagnostics: readonly Diagnostic[];
}

const hasMergeKey = (value: JsonValue): boolean => {
  if (Array.isArray(value)) {
    for (const entry of value as readonly JsonValue[]) {
      if (hasMergeKey(entry)) return true;
    }
    return false;
  }
  if (value !== null && typeof value === 'object') {
    const record = value as { readonly [key: string]: JsonValue };
    for (const key of Object.keys(record)) {
      if (key === '<<') return true;
      const entry = record[key];
      if (entry !== undefined && hasMergeKey(entry)) return true;
    }
  }
  return false;
};

const yamlDiagnostic = (context: YamlContext, code: string, error: unknown): Diagnostic => {
  const message =
    error !== null && typeof error === 'object' && 'message' in error
      ? String((error as { readonly message: unknown }).message)
      : String(error);
  return diag(code, { package: context.package, file: context.file, args: { message } });
};

/**
 * Parses `text` as strict YAML (TDS-20.2). Returns `null` for the value when
 * the document is invalid. Reports `yaml_duplicate_key`, `yaml_parse_error`,
 * and `yaml_merge_key`.
 *
 * Source: TDS-20.2, A7
 */
export function parseYamlStrict(text: string, context: YamlContext): YamlParseOutcome {
  const document = parseDocument(text, { merge: false, uniqueKeys: true, customTags: [] });
  const tagErrors = document.warnings.filter((warning) => warning.code === 'TAG_RESOLVE_FAILED');
  if (document.errors.length > 0 || tagErrors.length > 0) {
    const diagnostics = [
      ...document.errors.map((error) => {
        const code = error.code === 'DUPLICATE_KEY' ? 'yaml_duplicate_key' : 'yaml_parse_error';
        return yamlDiagnostic(context, code, error);
      }),
      ...tagErrors.map((warning) => yamlDiagnostic(context, 'yaml_parse_error', warning)),
    ];
    return { value: null, diagnostics };
  }
  const value = document.toJS({ maxAliasCount: 100 }) as JsonValue;
  if (hasMergeKey(value)) {
    return {
      value: null,
      diagnostics: [diag('yaml_merge_key', { package: context.package, file: context.file })],
    };
  }
  return { value, diagnostics: [] };
}

/** A parsed package file, tied to its package and relative path. */
export interface ParsedFile {
  readonly package: string;
  readonly path: string;
  readonly document: JsonValue;
}

/** The outcome of parsing the files of a set of manifests. */
export interface ParseResult {
  readonly files: readonly ParsedFile[];
  readonly diagnostics: readonly Diagnostic[];
}

const compareFiles = (left: ParsedFile, right: ParsedFile): number => {
  const byPackage = det.compareStrings(left.package, right.package);
  return byPackage !== 0 ? byPackage : det.compareStrings(left.path, right.path);
};

/**
 * Reads and parses every file listed in every manifest (TDS-20.2 step 3).
 * Reports `missing_file` for a listed file a source cannot read, plus the YAML
 * diagnostics of `parseYamlStrict`. Output is ordered by ascending
 * `(package, path)`.
 *
 * Source: TDS-20.2, CONT-3
 */
export function parseFiles(
  manifests: readonly Manifest[],
  options: LoadOptions = DEFAULT_LOAD_OPTIONS,
): ParseResult {
  void options;
  const files: ParsedFile[] = [];
  const diagnostics: Diagnostic[] = [];
  for (const manifest of manifests) {
    for (const path of manifest.files) {
      const text = manifest.source.read(path);
      if (text === null) {
        diagnostics.push(diag('missing_file', { package: manifest.id, file: path }));
        continue;
      }
      const outcome = parseYamlStrict(text, { package: manifest.id, file: path });
      diagnostics.push(...outcome.diagnostics);
      if (outcome.value !== null) {
        files.push({ package: manifest.id, path, document: outcome.value });
      }
    }
  }
  files.sort(compareFiles);
  return { files, diagnostics };
}
