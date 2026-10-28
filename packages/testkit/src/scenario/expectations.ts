/**
 * Scenario expectation evaluation (VER-9.1). Expectations name a metric or an
 * event count and one exact comparator; they are evaluated in the pure runner
 * at the declared tick so the CLI, Vitest, and golden harness all see the same
 * result.
 *
 * Source: VER-9.1, REF-8
 */
import { ids } from '@aesfw/core';
import type { DomainEvent, EntityId, Registry } from '@aesfw/core';
import { locationSummary, needBreakdown } from '@aesfw/app';
import type { SessionState } from '@aesfw/app';
import type { JsonValue } from '@aesfw/content';
import type { ScenarioExpectation, ScenarioExpectationResult } from './types.js';

/** The comparators of VER-9.1, in report order. */
export const COMPARATORS = ['greater', 'greater_equal', 'less', 'less_equal', 'equal'] as const;

/** A comparator name (VER-9.1). */
export type Comparator = (typeof COMPARATORS)[number];

const asRecord = (value: JsonValue): Record<string, JsonValue> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, JsonValue>)
    : null;

const asString = (value: JsonValue | undefined): string | null =>
  typeof value === 'string' ? value : null;

const asNumber = (value: JsonValue | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Resolves `@<definition>#<n>` to the n-th entity of that definition in
 * ascending ID order (1-based, VER-9.1). Returns `null` for a malformed
 * reference or an out-of-range index.
 *
 * Source: VER-9.1
 */
export function resolveEntityRef(session: SessionState, reference: string): EntityId | null {
  if (!reference.startsWith('@')) return null;
  const separator = reference.lastIndexOf('#');
  if (separator <= 1) return null;
  const definitionId = reference.slice(1, separator);
  const index = Number(reference.slice(separator + 1));
  if (!Number.isInteger(index) || index < 1) return null;
  const registry: Registry = session.content.registry;
  const handle = registry.handleOf('entity', ids.stringId(definitionId));
  if (handle === null) return null;
  const definitionStore = session.world.stores.get<{ definition: number }>('definition');
  const matches = definitionStore
    .ids()
    .filter((entity) => definitionStore.get(entity)?.definition === handle)
    .sort((a, b) => a - b);
  return matches[index - 1] ?? null;
}

/**
 * The population of one tier, aggregated over every known location
 * (PIC-10.2). `tier` may be `null` for the whole world.
 *
 * Source: VER-9.1, PIC-10.2
 */
const populationOf = (session: SessionState, tier: string | null): number => {
  const actor = session.settings.actor;
  let total = 0;
  for (const location of session.world.stores.get('location').ids()) {
    const summary = locationSummary(session, actor, location);
    for (const [id, count] of Object.entries(summary?.population_by_tier ?? {})) {
      if (tier !== null && id !== tier) continue;
      total += count;
    }
  }
  return total;
};

/**
 * The satisfaction permille of one residence from the need read model
 * (PIC-10.3), or `null` when the entity is not a residence or has no needs.
 *
 * Source: VER-9.1, PIC-10.3
 */
const satisfactionOf = (session: SessionState, reference: string): number | null => {
  const entity = resolveEntityRef(session, reference);
  if (entity === null) return null;
  for (const row of needBreakdown(session, session.settings.actor, entity)) {
    if (typeof row.satisfaction === 'number') return row.satisfaction;
  }
  return null;
};

/**
 * The value a `metric` expectation names, or `null` when it does not resolve.
 *
 * Source: VER-9.1
 */
const metricValue = (
  session: SessionState,
  metric: Record<string, JsonValue>,
): { readonly target: string; readonly value: number | null } | null => {
  const population = asRecord(metric['population'] ?? null);
  if (population !== null) {
    const tier = asString(population['tier']);
    return {
      target: tier === null ? 'population' : `population:${tier}`,
      value: populationOf(session, tier),
    };
  }
  const satisfaction = asRecord(metric['satisfaction'] ?? null);
  if (satisfaction !== null) {
    const reference = asString(satisfaction['entity']);
    if (reference === null) return null;
    return { target: `satisfaction:${reference}`, value: satisfactionOf(session, reference) };
  }
  return null;
};

/**
 * The number of events matching `type` and an optional `reason` payload field
 * since tick 0 (VER-9.1).
 *
 * Source: VER-9.1
 */
const eventCount = (
  events: readonly DomainEvent[],
  filter: Record<string, JsonValue>,
): { readonly target: string; readonly value: number } | null => {
  const type = asString(filter['type']);
  if (type === null) return null;
  const reason = asString(filter['reason']);
  const count = events.filter((event) => {
    if (event.type !== type) return false;
    if (reason === null) return true;
    const payload = asRecord(event.payload);
    return payload !== null && payload['reason'] === reason;
  }).length;
  return {
    target: reason === null ? `event:${type}` : `event:${type}:${reason}`,
    value: count,
  };
};

/** Applies one exact comparator (VER-9.1). */
export const compare = (actual: number, comparator: Comparator, expected: number): boolean => {
  switch (comparator) {
    case 'greater':
      return actual > expected;
    case 'greater_equal':
      return actual >= expected;
    case 'less':
      return actual < expected;
    case 'less_equal':
      return actual <= expected;
    case 'equal':
      return actual === expected;
  }
};

/**
 * Evaluates one expectation against the current session state (VER-9.1).
 * Unresolvable expectations report `ok: false` with a `null` actual value
 * rather than throwing, so one bad entry cannot hide the rest of the run.
 *
 * Source: VER-9.1
 */
export function evaluateExpectation(
  session: SessionState,
  events: readonly DomainEvent[],
  expectation: ScenarioExpectation,
): ScenarioExpectationResult {
  const raw = asRecord(expectation.raw) ?? {};
  const comparatorEntry = COMPARATORS.map((name) => [name, asNumber(raw[name])] as const).find(
    ([, value]) => value !== null,
  );
  const metric = asRecord(raw['metric'] ?? null);
  const count = asRecord(raw['event_count'] ?? null);
  const resolved =
    metric !== null
      ? metricValue(session, metric)
      : count !== null
        ? eventCount(events, count)
        : null;
  const comparator = comparatorEntry?.[0] ?? 'equal';
  const expected = comparatorEntry?.[1] ?? 0;
  const value = resolved?.value ?? null;
  return {
    tick: expectation.at,
    kind: metric !== null ? 'metric' : count !== null ? 'event_count' : 'unknown',
    target: resolved?.target ?? 'unresolved',
    comparator,
    expected,
    actual: value,
    ok: value !== null && compare(value, comparator, expected),
  };
}
