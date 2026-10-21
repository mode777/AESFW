/**
 * The `Diagnostic` shape used by the core API (TDS-10.1, TDS-20.3). It is
 * defined in `@aesfw/core` so that core signatures can reference it without
 * importing `@aesfw/content` (TDS-4.3 rule 2); `@aesfw/content` re-exports it
 * (amendment A-04, roadmap row 0.5).
 *
 * Source: TDS-20.3, TDS-10.1
 */
export interface Diagnostic {
  /** Stable diagnostic code, for example `invalid_canonical_state`. */
  readonly code: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly package: string | null;
  readonly file: string | null;
  readonly path: string | null;
  readonly definition: string | null;
  readonly args: Readonly<Record<string, string | number | boolean>>;
}
