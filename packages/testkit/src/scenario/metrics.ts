/**
 * Scenario metrics rows (REF-8). The runner assembles plain records every
 * `run.metrics_interval` ticks; the CLI renders CSV. No floating point: money,
 * rates, and trade volume are base units, satisfaction is permille.
 *
 * The row is content-neutral: owner-scoped amounts are reported per resource
 * ID, so a package names its own currency and the row carries no reference
 * identifiers.
 *
 * Source: REF-8, PIC-10.6, PIC-10.2, PIC-10.3
 */
import type { DomainEvent } from '@aesfw/core';
import { locationSummary, project } from '@aesfw/app';
import type { SessionState } from '@aesfw/app';

/** One metrics checkpoint. */
export interface ScenarioMetricsRow {
  readonly tick: number;
  /** Owner-scoped resource amounts by resource ID, ascending. */
  readonly balance: Readonly<Record<string, number>>;
  /** Revenue minus expenses per tick, base units (PIC-10.6). */
  readonly netRate: number;
  /** Population by tier ID, ascending. */
  readonly population: Readonly<Record<string, number>>;
  /** Satisfaction permille by residence entity ID, ascending. */
  readonly satisfaction: Readonly<Record<string, number>>;
  /** Traded quantity in base units by exchange ID, ascending, in the interval. */
  readonly trade: Readonly<Record<string, number>>;
}

/** Sorts a record's keys ascending, returning a new insertion-ordered record. */
const sortKeys = (values: Readonly<Record<string, number>>): Record<string, number> => {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(values).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))) {
    sorted[key] = values[key] ?? 0;
  }
  return sorted;
};

/**
 * Collects trade volume by exchange from `Traded` events emitted after
 * `sinceTick` (REF-8 D3).
 *
 * Source: REF-8
 */
const tradeVolume = (
  events: readonly DomainEvent[],
  sinceTick: number,
): Readonly<Record<string, number>> => {
  const trade: Record<string, number> = {};
  for (const event of events) {
    if (event.type !== 'Traded' || event.tick <= sinceTick) continue;
    const payload = (event.payload ?? null) as Record<string, unknown> | null;
    const exchange = payload === null ? null : payload['exchange'];
    const quantity = payload === null ? null : payload['quantity'];
    if (typeof exchange !== 'string' || typeof quantity !== 'number') continue;
    trade[exchange] = (trade[exchange] ?? 0) + quantity;
  }
  return sortKeys(trade);
};

/**
 * Assembles one metrics row from the authoritative session state: owner
 * amounts and net rate from the PIC-10.6 projection, population by tier from
 * the location summaries, satisfaction per residence, and trade volume.
 *
 * Source: REF-8
 */
export function metricsRow(
  session: SessionState,
  events: readonly DomainEvent[],
  sinceTick: number,
): ScenarioMetricsRow {
  const actor = session.settings.actor;
  const snapshot = project(session, actor);
  const owner = snapshot.owners.find((entry) => entry.owner_id === `owner.${actor}`);

  const population: Record<string, number> = {};
  for (const location of session.world.stores.get('location').ids()) {
    const summary = locationSummary(session, actor, location);
    for (const [tier, count] of Object.entries(summary?.population_by_tier ?? {})) {
      population[tier] = (population[tier] ?? 0) + count;
    }
  }

  const satisfaction: Record<string, number> = {};
  const satisfactionStore = session.world.stores.get<{ z: number }>('satisfaction');
  for (const entity of [...satisfactionStore.ids()].sort((a, b) => a - b)) {
    const z = satisfactionStore.get(entity)?.z;
    if (typeof z === 'number') satisfaction[`${entity}`] = z;
  }

  return {
    tick: session.world.tick,
    balance: sortKeys({ ...(owner?.resources ?? {}) }),
    netRate: owner?.balance?.net_per_interval ?? 0,
    population: sortKeys(population),
    satisfaction: sortKeys(satisfaction),
    trade: tradeVolume(events, sinceTick),
  };
}

/** The fixed leading metrics columns (REF-8). */
export const METRICS_HEADER_BASE = ['tick', 'net_rate'] as const;

/**
 * Renders one row as CSV cells in header order, defaulting absent columns to
 * `0` so a column that first appears mid-run keeps every row aligned.
 *
 * Source: REF-8
 */
export const metricsCells = (
  row: ScenarioMetricsRow,
  header: readonly string[] = metricsHeader([row]),
): readonly number[] =>
  header.map((column) => {
    if (column === 'tick') return row.tick;
    if (column === 'net_rate') return row.netRate;
    const separator = column.indexOf('.');
    const group = separator < 0 ? column : column.slice(0, separator);
    const key = separator < 0 ? '' : column.slice(separator + 1);
    switch (group) {
      case 'balance':
        return row.balance[key] ?? 0;
      case 'population':
        return row.population[key] ?? 0;
      case 'satisfaction':
        return row.satisfaction[key] ?? 0;
      case 'trade':
        return row.trade[key] ?? 0;
      default:
        return 0;
    }
  });

/**
 * The header for a set of rows: the union of the columns across every row,
 * each group in ascending ID order (REF-8 D6). The union matters because the
 * tick-0 row samples before any phase has written population or satisfaction,
 * and a trade column first appears at the first trade.
 *
 * Source: REF-8
 */
export const metricsHeader = (rows: readonly ScenarioMetricsRow[]): readonly string[] => {
  const balance = new Set<string>();
  const population = new Set<string>();
  const satisfaction = new Set<string>();
  const trade = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.balance)) balance.add(key);
    for (const key of Object.keys(row.population)) population.add(key);
    for (const key of Object.keys(row.satisfaction)) satisfaction.add(key);
    for (const key of Object.keys(row.trade)) trade.add(key);
  }
  const sorted = (values: ReadonlySet<string>): string[] =>
    [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return [
    ...METRICS_HEADER_BASE,
    ...sorted(balance).map((key) => `balance.${key}`),
    ...sorted(population).map((key) => `population.${key}`),
    ...sorted(satisfaction).map((key) => `satisfaction.${key}`),
    ...sorted(trade).map((key) => `trade.${key}`),
  ];
};
