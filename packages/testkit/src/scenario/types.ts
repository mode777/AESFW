/**
 * The scenario model (VER-9.1). A scenario is plain data parsed from YAML; the
 * runner is pure and I/O-free.
 *
 * Source: VER-9.1
 */
import type { DomainEvent } from '@aesfw/core';
import type { JsonValue } from '@aesfw/content';

/** The scenario setup. */
export interface ScenarioSetup {
  readonly seed: readonly [number, number];
  readonly tickDurationMs: number;
  readonly world: string | null;
}

/** A scenario command (parsed but not applied until 2.2). */
export interface ScenarioCommand {
  readonly tick: number;
  readonly actor: string;
  readonly type: string;
  readonly payload: JsonValue;
}

/** The run settings. */
export interface ScenarioRun {
  readonly ticks: number;
  readonly hashInterval: number;
  readonly invariants: boolean;
  /** Ticks between metrics rows (REF-8); `0` disables rows. */
  readonly metricsInterval: number;
}

/** A scenario expectation (VER-9.1). */
export interface ScenarioExpectation {
  readonly at: number;
  readonly raw: JsonValue;
}

/** A parsed scenario. */
export interface Scenario {
  readonly id: string;
  readonly requirements: readonly string[];
  readonly content: { readonly packages: readonly string[] };
  readonly setup: ScenarioSetup;
  readonly commands: readonly ScenarioCommand[];
  readonly run: ScenarioRun;
  readonly golden: { readonly hashes: string } | null;
  readonly expect: readonly ScenarioExpectation[];
}

/** A hash checkpoint. */
export interface ScenarioCheckpoint {
  readonly tick: number;
  readonly hash: string;
}

/** An invariant finding at a tick. */
export interface ScenarioFinding {
  readonly tick: number;
  readonly id: string;
  readonly message: string;
}

/** The outcome of one expectation (VER-9.1). */
export interface ScenarioExpectationResult {
  readonly tick: number;
  readonly kind: 'metric' | 'event_count' | 'unknown';
  /** The resolved metric (`population:<tier>`, `satisfaction:<ref>`) or event filter. */
  readonly target: string;
  readonly comparator: string;
  readonly expected: number;
  readonly actual: number | null;
  readonly ok: boolean;
}

/** The outcome of running a scenario. */
export interface ScenarioReport {
  readonly id: string;
  readonly checkpoints: readonly ScenarioCheckpoint[];
  readonly events: readonly DomainEvent[];
  readonly findings: readonly ScenarioFinding[];
  readonly expectations: readonly ScenarioExpectationResult[];
  readonly metrics: readonly ScenarioMetrics[];
}

/** A metrics checkpoint row (REF-8). */
export interface ScenarioMetrics {
  readonly tick: number;
  readonly balance: Readonly<Record<string, number>>;
  readonly netRate: number;
  readonly population: Readonly<Record<string, number>>;
  readonly satisfaction: Readonly<Record<string, number>>;
  readonly trade: Readonly<Record<string, number>>;
}
