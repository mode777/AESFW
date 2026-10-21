/**
 * `alloc-v1` — proportional allocation (TDS-6.3). Used for internal-logistics
 * throughput (phase 10) and proportional capability models. Requests are taken
 * in ascending requester (entity) ID order; the caller is responsible for that
 * order. This algorithm is versioned: changing it changes state hashes and
 * requires a version bump (TDS-19.4).
 *
 * Source: TDS-6.3
 */
import { InvariantViolation } from '../errors/invariant-violation.js';
import { isNonNegativeSafeInt, toSafeInt } from './round.js';
import type { Int } from './round.js';

/** Grants and throttle factors, in the same order as the requests. */
export interface AllocationResult {
  readonly grants: readonly Int[];
  readonly throttlePermille: readonly Int[];
}

const invalidInput = (field: string, value: number): never => {
  throw new InvariantViolation('invalid_allocation_input', { field, value: String(value) });
};

/**
 * Allocates `capacity` (≥ 0) across `requests` (each ≥ 0) with algorithm
 * `alloc-v1` (TDS-6.3). Grants sum to `min(capacity, Σrequests)`, no grant
 * exceeds its request, and the remainder goes to the largest exact remainders
 * with ties broken by ascending requester order. Each requester receives a
 * `throttle_permille` of `1000` when its request is zero and
 * `floor(1000 × grant / request)` otherwise.
 *
 * Source: TDS-6.3
 */
export function allocate(capacity: Int, requests: readonly Int[]): AllocationResult {
  if (!isNonNegativeSafeInt(capacity)) invalidInput('capacity', capacity);
  for (const request of requests) {
    if (!isNonNegativeSafeInt(request)) invalidInput('request', request);
  }

  const count = requests.length;
  if (count === 0) return { grants: [], throttlePermille: [] };

  const cap = BigInt(capacity);
  const req: bigint[] = [];
  for (const request of requests) req.push(BigInt(request));

  let total = 0n;
  for (const request of req) total += request;

  const grants: bigint[] = new Array<bigint>(count).fill(0n);

  if (total <= cap) {
    for (let i = 0; i < count; i += 1) grants[i] = req[i] ?? 0n;
  } else {
    const remainders: bigint[] = new Array<bigint>(count).fill(0n);
    let baseSum = 0n;
    for (let i = 0; i < count; i += 1) {
      const product = cap * (req[i] ?? 0n);
      const base = product / total;
      grants[i] = base;
      remainders[i] = product % total;
      baseSum += base;
    }

    let leftover = cap - baseSum;
    const order: number[] = new Array<number>(count);
    for (let i = 0; i < count; i += 1) order[i] = i;
    order.sort((a, b) => {
      const remA = remainders[a] ?? 0n;
      const remB = remainders[b] ?? 0n;
      if (remA > remB) return -1;
      if (remA < remB) return 1;
      return a - b;
    });

    for (const index of order) {
      if (leftover <= 0n) break;
      const grant = grants[index] ?? 0n;
      const request = req[index] ?? 0n;
      if (grant < request) {
        grants[index] = grant + 1n;
        leftover -= 1n;
      }
    }
  }

  const outGrants: Int[] = [];
  const throttlePermille: Int[] = [];
  for (let i = 0; i < count; i += 1) {
    const grant = grants[i] ?? 0n;
    outGrants.push(toSafeInt(grant, 'allocate', { index: i }));
    const request = requests[i] ?? 0;
    throttlePermille.push(request === 0 ? 1000 : Number((1000n * grant) / (req[i] ?? 1n)));
  }

  return { grants: outGrants, throttlePermille };
}
