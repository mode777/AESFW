/**
 * Curves (CONT-8, TDS-14.4): compile sorted integer point arrays and evaluate
 * them with the configured extrapolation policy. Piecewise-linear
 * interpolation floors via `fx.mulDiv`.
 *
 * Source: CONT-8, TDS-14.4
 */
import { fx } from '@aesfw/core';
import type { Diagnostic } from '@aesfw/core';

import { diag } from '../diagnostics/diagnostics.js';
import type { JsonValue } from '../types.js';

/** A curve type (CONT-8). */
export type CurveType = 'constant' | 'piecewise_linear' | 'step' | 'lookup';

/** A curve extrapolation policy (CONT-8). */
export type Extrapolation = 'clamp' | 'linear' | 'error';

/** A compiled curve (TDS-14.4). */
export interface CompiledCurve {
  readonly id: string;
  readonly type: CurveType;
  readonly points: readonly (readonly [number, number])[];
  readonly extrapolation: Extrapolation;
}

/** The outcome of compiling a curve. */
export interface CompileCurveResult {
  readonly curve: CompiledCurve | null;
  readonly diagnostics: readonly Diagnostic[];
}

const CURVE_TYPES: readonly CurveType[] = ['constant', 'piecewise_linear', 'step', 'lookup'];
const EXTRAPOLATIONS: readonly Extrapolation[] = ['clamp', 'linear', 'error'];

const isRecord = (value: JsonValue | undefined): value is { readonly [key: string]: JsonValue } =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value);

const toInt = (value: number): number => value;

const asPoint = (value: JsonValue | undefined): readonly [number, number] | null => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [x, y] = value as readonly JsonValue[];
  if (typeof x !== 'number' || typeof y !== 'number') return null;
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) return null;
  return [x, y];
};

/**
 * Compiles a curve definition (TDS-14.4).
 *
 * Source: CONT-8, TDS-14.4
 */
export function compileCurve(definition: JsonValue): CompileCurveResult {
  const record = isRecord(definition) ? definition : null;
  const id = record !== null && typeof record['id'] === 'string' ? record['id'] : null;
  const fail = (): CompileCurveResult => ({
    curve: null,
    diagnostics: [diag('invalid_curve', { definition: id })],
  });
  if (record === null || id === null) return fail();
  const type = record['type'];
  if (typeof type !== 'string' || !(CURVE_TYPES as readonly string[]).includes(type)) return fail();
  const rawPoints = record['points'];
  if (!Array.isArray(rawPoints)) return fail();
  const points: [number, number][] = [];
  for (const rawPoint of rawPoints as readonly JsonValue[]) {
    const point = asPoint(rawPoint);
    if (point === null) return fail();
    points.push([point[0], point[1]]);
  }
  if (points.length === 0) return fail();
  points.sort((left, right) => left[0] - right[0]);
  const extrapolationValue = record['extrapolation'];
  const extrapolation: Extrapolation =
    typeof extrapolationValue === 'string' &&
    (EXTRAPOLATIONS as readonly string[]).includes(extrapolationValue)
      ? (extrapolationValue as Extrapolation)
      : 'clamp';
  return {
    curve: { id, type: type as CurveType, points, extrapolation },
    diagnostics: [],
  };
}

const interpolate = (
  left: readonly [number, number],
  right: readonly [number, number],
  input: number,
): number => {
  const deltaX = right[0] - left[0];
  if (deltaX === 0) return right[1];
  return (
    left[1] + fx.mulDiv(toInt(right[1] - left[1]), toInt(input - left[0]), toInt(deltaX), 'floor')
  );
};

/**
 * Evaluates a curve at `input` (TDS-14.4). Under the `error` policy an
 * out-of-domain input is clamped and a `curve_extrapolation_error` is appended
 * to `diagnostics`.
 *
 * Source: CONT-8, TDS-14.4
 */
export function evaluateCurve(
  curve: CompiledCurve,
  input: number,
  diagnostics: Diagnostic[] = [],
): number {
  const points = curve.points;
  const first = points[0];
  const last = points[points.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (curve.type === 'constant') return first[1];

  if (input <= first[0]) {
    if (input === first[0]) return first[1];
    if (curve.extrapolation === 'linear' && points.length >= 2) {
      const second = points[1];
      if (second !== undefined) return interpolate(first, second, input);
    }
    if (curve.extrapolation === 'error') {
      diagnostics.push(
        diag('curve_extrapolation_error', { definition: curve.id, args: { input } }),
      );
    }
    return first[1];
  }

  if (input >= last[0]) {
    if (input === last[0]) return last[1];
    if (curve.extrapolation === 'linear' && points.length >= 2) {
      const previous = points[points.length - 2];
      if (previous !== undefined) return interpolate(previous, last, input);
    }
    if (curve.extrapolation === 'error') {
      diagnostics.push(
        diag('curve_extrapolation_error', { definition: curve.id, args: { input } }),
      );
    }
    return last[1];
  }

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index];
    const right = points[index + 1];
    if (left === undefined || right === undefined) continue;
    if (input >= left[0] && input <= right[0]) {
      if (curve.type === 'piecewise_linear') return interpolate(left, right, input);
      return left[1];
    }
  }
  return last[1];
}
