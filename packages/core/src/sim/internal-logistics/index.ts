/**
 * `sim/internal-logistics` — throughput pools, request collection (phase 09),
 * allocation (phase 10), and throttling helpers (GDD-6.6, GDD-15.1).
 *
 * Source: GDD-6.6, GDD-15.1, ARCH-5.2, TDS-11.3
 */
export {
  allocateThroughput,
  collectThroughputRequests,
  readThroughputRequests,
  throughputCapacity,
  throughputPoolOf,
} from './pool.js';
export { throttlePermilleOf, throttleQuantity } from './throttle.js';
export { THROUGHPUT_LIMITED_POLICY, THROUGHPUT_REQUESTS_KEY } from './types.js';
export type { ThroughputAllocation, ThroughputPool, ThroughputRequest } from './types.js';
