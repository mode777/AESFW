/**
 * Diagnostic construction for the content pipeline (TDS-20.3). Diagnostics are
 * data: stages return them, they never throw for malformed input (TDS-23).
 *
 * Source: TDS-20.3, TDS-23
 */
import type { Diagnostic } from '@aesfw/core';

/** Optional fields of a diagnostic; omitted fields become `null` or `{}`. */
export interface DiagFields {
  readonly severity?: 'error' | 'warning' | 'info';
  readonly package?: string | null;
  readonly file?: string | null;
  readonly path?: string | null;
  readonly definition?: string | null;
  readonly args?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Builds a diagnostic with the core shape (TDS-20.3).
 *
 * Source: TDS-20.3
 */
export function diag(code: string, fields: DiagFields = {}): Diagnostic {
  return {
    code,
    severity: fields.severity ?? 'error',
    package: fields.package ?? null,
    file: fields.file ?? null,
    path: fields.path ?? null,
    definition: fields.definition ?? null,
    args: fields.args ?? {},
  };
}

/** True when at least one diagnostic has error severity. */
export function hasError(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === 'error');
}
