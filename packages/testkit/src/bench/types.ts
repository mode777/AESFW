/**
 * Benchmark result and option types (TDS-24, VER-14).
 *
 * Source: TDS-24, VER-14
 */
/** The options of a benchmark run. */
export interface BenchmarkOptions {
  readonly iterations: number;
  readonly warmup: number;
  /** The clock; injected so the pure testkit never reads one itself. */
  readonly now: () => number;
}

/** The outcome of a benchmark run. */
export interface BenchmarkResult {
  readonly scenario: string;
  readonly entities: number;
  readonly iterations: number;
  readonly medianMs: number;
  readonly p95Ms: number;
}
