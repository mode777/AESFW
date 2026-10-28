/**
 * `@aesfw/testkit/scenario` — the pure scenario model and runner (VER-9).
 *
 * Source: VER-9
 */
export { parseScenario } from './parse.js';
export type { ParseScenarioResult } from './parse.js';
export { COMPARATORS, compare, evaluateExpectation, resolveEntityRef } from './expectations.js';
export type { Comparator } from './expectations.js';
export { METRICS_HEADER_BASE, metricsCells, metricsHeader, metricsRow } from './metrics.js';
export type { ScenarioMetricsRow } from './metrics.js';
export { runScenario } from './runner.js';
export type {
  Scenario,
  ScenarioCheckpoint,
  ScenarioCommand,
  ScenarioExpectation,
  ScenarioExpectationResult,
  ScenarioFinding,
  ScenarioMetrics,
  ScenarioReport,
  ScenarioRun,
  ScenarioSetup,
} from './types.js';
