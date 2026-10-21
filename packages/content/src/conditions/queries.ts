/**
 * The domain-query table (CONT-7.2, TDS-14.2). The initial queries return an
 * `Int`; the simulation rows supply their implementations through the
 * `EvalContext` (design D4/D5).
 *
 * Source: CONT-7.2, TDS-14.2
 */
/** The initial domain-query names (CONT-7.2). */
export const QUERY_TABLE = [
  'population_count',
  'residence_population',
  'need_category_fulfillment',
  'aggregate_need_fulfillment',
  'satisfaction_band',
  'location_property',
  'knowledge_state',
  'owner_balance',
  'owner_net_rate',
  'exchange_price',
] as const;

/** A known domain-query name. */
export type QueryName = (typeof QUERY_TABLE)[number];

/** True when `name` is a known domain query (TDS-14.2). */
export function isKnownQuery(name: string): name is QueryName {
  return (QUERY_TABLE as readonly string[]).includes(name);
}
