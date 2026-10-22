/**
 * Content-derived resource classifications for the owner balance model
 * (GDD-7.5, GDD-11.3, GDD-20.2). The registry's raw resource and curve
 * definitions decide behavior; core stays content-free through the optional
 * `Registry.definitionDataOf` accessor (TDS-7).
 *
 * Source: GDD-7.5, GDD-11.3, TDS-7
 */
import { evaluateCompiledCurve } from '../../fx/index.js';
import type { Int } from '../../fx/index.js';
import type { DefinitionHandle } from '../../ids/index.js';
import type { Registry } from '../../registry/types.js';
import type { JsonValue } from '../../det/index.js';

type Data = { readonly [key: string]: JsonValue };

const asRecord = (value: JsonValue | null | undefined): Data | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : null;

const asString = (value: JsonValue | undefined): string | null =>
  typeof value === 'string' ? value : null;

/**
 * The storage policy of a resource definition, or `null` when unknown.
 * `recomputed` marks a capability; `normal` marks a storable resource.
 *
 * Source: CONT-6.2, GDD-11.3
 */
export function resourceStoragePolicy(
  registry: Registry,
  resource: DefinitionHandle,
): 'normal' | 'recomputed' | null {
  const data = asRecord(registry.definitionDataOf?.('resource', resource));
  const policy = asString(
    data?.['storage'] !== undefined ? asRecord(data?.['storage'])?.['policy'] : undefined,
  );
  if (policy === 'normal' || policy === 'recomputed') return policy;
  return null;
}

/**
 * Evaluates a curve definition at `input` (TDS-14.4). Unknown or malformed
 * curve data yields the full rate `1000`; content validation rejects malformed
 * curves at load time.
 *
 * Source: GDD-11.3, TDS-14.4
 */
export function curveMultiplier(registry: Registry, curve: DefinitionHandle, input: Int): Int {
  const data = asRecord(registry.definitionDataOf?.('curve', curve));
  if (data === null) return 1000;
  const rawPoints = data['points'];
  if (!Array.isArray(rawPoints)) return 1000;
  const points: (readonly [Int, Int])[] = [];
  for (const entry of rawPoints) {
    const pair: readonly JsonValue[] = Array.isArray(entry) ? entry : [];
    const x = pair[0];
    const y = pair[1];
    if (typeof x !== 'number' || typeof y !== 'number') return 1000;
    points.push([x, y]);
  }
  const type = asString(data['type']);
  const extrapolation = asString(data['extrapolation']);
  if (type !== 'constant' && type !== 'piecewise_linear' && type !== 'step' && type !== 'lookup') {
    return 1000;
  }
  if (points.length === 0) return 1000;
  return evaluateCompiledCurve(
    {
      type,
      points,
      extrapolation:
        extrapolation === 'linear' || extrapolation === 'error' ? extrapolation : 'clamp',
    },
    input,
  );
}
