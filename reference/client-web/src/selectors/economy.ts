/**
 * The economy view model (REF-12.4, PIC-10.6). Every value comes from the
 * projection's owner balance entry; the trend is client-local history of the
 * net rate (4.4 defers history to the client).
 *
 * Source: REF-12.4, PIC-10.6
 */
import type { OwnerDto, SnapshotDto } from '@aesfw/protocol';

/** The reference balance resource (07 §5 R1). */
export const CREDITS_RESOURCE_ID = 'ref.tier.resource.credits';

/** The reference base scale (07 §4: 6000 base units per display unit). */
export const REFERENCE_BASE_SCALE = 6000;

/** The trend history length kept by the client. */
export const TREND_LENGTH = 60;

/** One revenue or expense source row. */
export interface EconomySourceRow {
  readonly source: string;
  readonly amount: number;
}

/** The economy drawer view model (REF-12.4). */
export interface EconomyViewModel {
  readonly credits: number | null;
  readonly revenuePerTick: number;
  readonly expensesPerTick: number;
  readonly netPerTick: number;
  readonly revenue: readonly EconomySourceRow[];
  readonly expenses: readonly EconomySourceRow[];
  readonly idlePaying: readonly number[];
  readonly deficitPaused: readonly number[];
  readonly trend: readonly number[];
}

const rowsOf = (
  sources: Readonly<Record<string, number>> | undefined,
): readonly EconomySourceRow[] =>
  Object.entries(sources ?? {})
    .map(([source, amount]) => ({ source, amount }))
    .sort((left, right) => (left.source < right.source ? -1 : left.source > right.source ? 1 : 0));

/** Finds the actor's owner entry in a projection (REF-12.4). */
export function ownerEntry(projection: SnapshotDto | null, ownerId: string): OwnerDto | undefined {
  return projection?.owners.find((owner) => owner.owner_id === ownerId);
}

/**
 * Builds the economy drawer view model (REF-12.4, PIC-10.6).
 *
 * Source: REF-12.4, PIC-10.6
 */
export function economyView(
  projection: SnapshotDto | null,
  ownerId: string,
  trend: readonly number[],
): EconomyViewModel {
  const owner = ownerEntry(projection, ownerId);
  const balance = owner?.balance;
  return {
    credits: owner?.resources[CREDITS_RESOURCE_ID] ?? null,
    revenuePerTick: balance?.revenue_per_interval ?? 0,
    expensesPerTick: balance?.expenses_per_interval ?? 0,
    netPerTick: balance?.net_per_interval ?? 0,
    revenue: rowsOf(balance?.revenue_by_source),
    expenses: rowsOf(balance?.expenses_by_source),
    idlePaying: [...(balance?.idle_paying_entities ?? [])],
    deficitPaused: [...(balance?.deficit_paused_entities ?? [])],
    trend: [...trend],
  };
}

/**
 * Appends a net-rate sample to the trend history, keeping the newest
 * `length` samples (REF-12.4).
 *
 * Source: REF-12.4
 */
export function pushTrend(
  history: readonly number[],
  sample: number,
  length = TREND_LENGTH,
): readonly number[] {
  const next = [...history, sample];
  return next.length > length ? next.slice(next.length - length) : next;
}
