/**
 * The definition merge algorithm (CONT-5). Scalars override, mappings merge by
 * key, arrays replace by default, and a merge directive applies an explicit
 * `append`, `prepend`, or `remove` operation to the inherited list.
 *
 * Source: CONT-5, A-05
 */
import { det } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { JsonValue } from '../types.js';

/** A plain mapping of JSON values. */
export type JsonRecord = { readonly [key: string]: JsonValue };

/** True when `value` is a plain mapping. */
export const isRecord = (value: JsonValue | undefined): value is JsonRecord =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);

const DIRECTIVE_KEYS = ['append', 'prepend', 'remove'] as const;

type DirectiveKey = (typeof DIRECTIVE_KEYS)[number];

/** Where a merge diagnostic points. */
export interface MergeContext {
  readonly package: string | null;
  readonly file: string | null;
  readonly path: string;
}

const directiveKeyOf = (value: JsonRecord): DirectiveKey | 'invalid' | null => {
  const keys = Object.keys(value);
  const present = DIRECTIVE_KEYS.filter((key) => keys.includes(key));
  if (present.length === 0) return null;
  if (present.length > 1 || keys.length !== 1) return 'invalid';
  return present[0] ?? 'invalid';
};

/** Deep JSON clone, so merged results never alias their inputs. */
export const cloneJson = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    const list = value as readonly JsonValue[];
    return list.map((entry) => cloneJson(entry));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as { readonly [key: string]: JsonValue };
    const result: { [key: string]: JsonValue } = {};
    for (const key of Object.keys(record)) {
      result[key] = cloneJson(record[key] ?? null);
    }
    return result;
  }
  return value;
};

/** Deep equality by canonical JSON (used by the `remove` operation). */
const deepEqual = (left: JsonValue, right: JsonValue): boolean =>
  det.canonicalStringify(left) === det.canonicalStringify(right);

const invalidDirective = (
  context: MergeContext,
  diagnostics: Diagnostic[],
): JsonValue | undefined => {
  diagnostics.push(
    diag('invalid_merge_directive', {
      package: context.package,
      file: context.file,
      path: context.path,
    }),
  );
  return undefined;
};

const applyDirective = (
  base: JsonValue | undefined,
  overlay: JsonRecord,
  key: DirectiveKey,
  context: MergeContext,
  diagnostics: Diagnostic[],
): JsonValue | undefined => {
  const values = overlay[key];
  if (!Array.isArray(values)) return invalidDirective(context, diagnostics);
  const baseList = Array.isArray(base) ? (base as readonly JsonValue[]) : [];
  const list = values as readonly JsonValue[];
  if (key === 'append') return [...baseList, ...list].map((entry) => cloneJson(entry));
  if (key === 'prepend') return [...list, ...baseList].map((entry) => cloneJson(entry));
  return baseList
    .filter((entry) => !list.some((removed) => deepEqual(entry, removed)))
    .map((entry) => cloneJson(entry));
};

/**
 * Merges `overlay` over `base` (CONT-5). Returns `undefined` and reports
 * `invalid_merge_directive` when an overlay directive is malformed.
 *
 * Source: CONT-5, A-05
 */
export function merge(
  base: JsonValue | undefined,
  overlay: JsonValue,
  context: MergeContext,
  diagnostics: Diagnostic[],
): JsonValue | undefined {
  if (isRecord(overlay)) {
    const key = directiveKeyOf(overlay);
    if (key === 'invalid') return invalidDirective(context, diagnostics);
    if (key !== null) return applyDirective(base, overlay, key, context, diagnostics);
    if (isRecord(base)) {
      const result: { [key: string]: JsonValue } = {};
      const keys = new Set([...Object.keys(base), ...Object.keys(overlay)]);
      for (const name of [...keys].sort(det.compareStrings)) {
        const hasBase = Object.prototype.hasOwnProperty.call(base, name);
        const hasOverlay = Object.prototype.hasOwnProperty.call(overlay, name);
        const childContext: MergeContext = { ...context, path: `${context.path}/${name}` };
        if (hasOverlay) {
          const merged = merge(
            hasBase ? base[name] : undefined,
            overlay[name] ?? null,
            childContext,
            diagnostics,
          );
          if (merged !== undefined) result[name] = merged;
        } else if (hasBase) {
          result[name] = cloneJson(base[name] ?? null);
        }
      }
      return result;
    }
  }
  return cloneJson(overlay);
}
