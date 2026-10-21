/**
 * The capability allocation models (GDD-14.2). Requests are supplied in
 * ascending entity-ID order; each model returns grants in the same order.
 *
 * Source: GDD-14.2, TDS-6.3
 */
import { allocate } from '../../fx/index.js';
import type { Int } from '../../fx/index.js';
import type { EntityId } from '../../ids/index.js';
import type { AllocationModel } from './types.js';

/** One consumer request within a pool. */
export interface CapabilityRequest {
  readonly entity: EntityId;
  readonly request: Int;
  readonly priority: number;
  readonly weight: Int;
}

const binary = (supply: Int, requests: readonly CapabilityRequest[]): Int[] => {
  let remaining = supply;
  return requests.map((entry) => {
    const grant = entry.request <= remaining ? entry.request : 0;
    remaining -= grant;
    return grant;
  });
};

const proportional = (supply: Int, requests: readonly CapabilityRequest[]): Int[] => [
  ...allocate(
    supply,
    requests.map((entry) => entry.request),
  ).grants,
];

const priority = (supply: Int, requests: readonly CapabilityRequest[]): Int[] => {
  const grants: Int[] = requests.map(() => 0);
  const order = requests
    .map((_, index) => index)
    .sort(
      (a, b) =>
        (requests[a]?.priority ?? 0) - (requests[b]?.priority ?? 0) ||
        (requests[a]?.entity ?? 0) - (requests[b]?.entity ?? 0),
    );
  let remaining = supply;
  for (const index of order) {
    const request = requests[index]?.request ?? 0;
    const grant = request <= remaining ? request : remaining;
    grants[index] = grant;
    remaining -= grant;
  }
  return grants;
};

const weighted = (supply: Int, requests: readonly CapabilityRequest[]): Int[] => {
  const first = requests[0];
  if (first === undefined) return [];
  if (requests.every((entry) => entry.weight === first.weight)) {
    return proportional(supply, requests);
  }
  const keys = requests.map((entry) => BigInt(entry.request) * BigInt(entry.weight));
  let totalKey = 0n;
  for (const key of keys) totalKey += key;
  if (totalKey <= 0n) return requests.map(() => 0);
  const cap = BigInt(supply);
  if (totalKey <= cap) return requests.map((entry) => entry.request);
  const grants = keys.map((key) => Number((cap * key) / totalKey));
  const remainders = keys.map((key) => (cap * key) % totalKey);
  for (let index = 0; index < grants.length; index += 1) {
    const request = requests[index]?.request ?? 0;
    if ((grants[index] ?? 0) > request) grants[index] = request;
  }
  let leftover = supply;
  for (const grant of grants) leftover -= grant;
  const order = requests
    .map((_, index) => index)
    .sort((a, b) => Number((remainders[b] ?? 0n) - (remainders[a] ?? 0n)) || a - b);
  for (const index of order) {
    if (leftover <= 0) break;
    const request = requests[index]?.request ?? 0;
    if ((grants[index] ?? 0) < request) {
      grants[index] = (grants[index] ?? 0) + 1;
      leftover -= 1;
    }
  }
  return grants;
};

/** Allocates `supply` across `requests` under `model` (GDD-14.2). */
export function allocateModel(
  model: AllocationModel,
  supply: Int,
  requests: readonly CapabilityRequest[],
): Int[] {
  switch (model) {
    case 'binary':
      return binary(supply, requests);
    case 'proportional':
      return proportional(supply, requests);
    case 'priority':
      return priority(supply, requests);
    case 'weighted':
      return weighted(supply, requests);
  }
}
