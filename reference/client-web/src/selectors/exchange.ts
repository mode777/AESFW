/**
 * Exchange drawer selectors (REF-12.4). Pure transforms from protocol DTOs to
 * the view model and the trade-order shortcut draft; no mechanics.
 *
 * Source: REF-12.4, PIC-10.7, REF-12.1
 */
import type { ExchangeQuotesDto, SnapshotDto } from '@aesfw/protocol';
import type { RouteActionDraft, RouteDraft } from './logistics.js';

/** One good row of the exchange drawer. */
export interface ExchangeGoodRow {
  readonly resourceId: string;
  readonly buy: number;
  readonly sell: number;
  readonly baseBuy: number;
  readonly baseSell: number;
  readonly recentSold: number;
  readonly recentBought: number;
  readonly buyRecoveryTicks?: number;
  readonly sellRecoveryTicks?: number;
}

/** One exchange row of the exchange drawer. */
export interface ExchangeRow {
  readonly entityId: number;
  readonly regionId?: string;
  readonly goods: readonly ExchangeGoodRow[];
}

/** The exchange drawer view model. */
export interface ExchangeViewModel {
  readonly exchanges: readonly ExchangeRow[];
}

/** Builds the drawer view model from the collected quotes (PIC-10.7). */
export function exchangeView(quotes: readonly ExchangeQuotesDto[]): ExchangeViewModel {
  return {
    exchanges: [...quotes]
      .sort((a, b) => a.entity_id - b.entity_id)
      .map((quote) => ({
        entityId: quote.entity_id,
        ...(quote.region_id === undefined ? {} : { regionId: quote.region_id }),
        goods: quote.goods.map((good) => ({
          resourceId: good.resource_id,
          buy: good.buy,
          sell: good.sell,
          baseBuy: good.base_buy,
          baseSell: good.base_sell,
          recentSold: good.recent_sold,
          recentBought: good.recent_bought,
          ...(good.buy_recovery_ticks === undefined
            ? {}
            : { buyRecoveryTicks: good.buy_recovery_ticks }),
          ...(good.sell_recovery_ticks === undefined
            ? {}
            : { sellRecoveryTicks: good.sell_recovery_ticks }),
        })),
      })),
  };
}

/** The entity ids of the projection whose definition is an exchange definition. */
export function exchangeEntities(
  projection: SnapshotDto | null,
  exchangeDefinitionIds: readonly string[],
): readonly number[] {
  const ids = new Set(exchangeDefinitionIds);
  const found: number[] = [];
  for (const entity of projection?.entities ?? []) {
    if (entity.definition_id !== undefined && ids.has(entity.definition_id)) {
      found.push(entity.entity_id);
    }
  }
  return found.sort((a, b) => a - b);
}

/**
 * The trade-order shortcut draft for one good (REF-12.4): a trade-mode order
 * with one station at the exchange and a fixed-quantity action. The default
 * quantity is the quoted recent volume (at least `1`); the route editor is
 * the authority for what is dispatched.
 *
 * Source: REF-12.4, REF-12.1
 */
export function tradeDraft(
  exchangeId: number,
  resourceId: string,
  direction: 'buy' | 'sell',
  quantity?: number,
): RouteDraft {
  const action: RouteActionDraft = {
    resourceId,
    action: direction,
    ruleMode: 'fixed',
    quantity: quantity === undefined || quantity < 1 ? 1 : quantity,
  };
  return {
    mode: 'trade',
    repeat: false,
    stations: [{ endpointId: exchangeId, actions: [action] }],
  };
}
