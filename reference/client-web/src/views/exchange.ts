/**
 * The exchange drawer (REF-12.4). Renders the exchange-quotes read model per
 * exchange: current buy and sell price versus base, recent volume, and the
 * recovery estimate, with buy and sell shortcuts that open a prefilled trade
 * order in the logistics route editor.
 *
 * Source: REF-12.4, PIC-10.7
 */
import { h, replaceChildren } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import type { ExchangeViewModel } from '../selectors/exchange.js';

/** A mounted exchange drawer. */
export interface ExchangeView {
  readonly el: HTMLElement;
  show(model: ExchangeViewModel): void;
}

/**
 * Creates the exchange drawer (REF-12.4).
 *
 * Source: REF-12.4
 */
export function createExchangeView(
  i18n: I18n,
  onTrade: (
    exchangeId: number,
    resourceId: string,
    direction: 'buy' | 'sell',
    quantity: number,
  ) => void,
): ExchangeView {
  const el = h('div', { class: 'drawer-panel exchange', 'data-testid': 'exchange-view' });

  const show = (model: ExchangeViewModel): void => {
    if (model.exchanges.length === 0) {
      replaceChildren(
        el,
        h('h3', { class: 'drawer-title', text: i18n.t('exchange.title') }),
        h('p', { class: 'empty', 'data-testid': 'exchange-empty', text: i18n.t('exchange.empty') }),
      );
      return;
    }
    const sections = model.exchanges.map((exchange) => {
      const goods = exchange.goods.map((good) => {
        const sellHint = i18n
          .t('exchange.recovery')
          .replace('{ticks}', String(good.sellRecoveryTicks ?? 0));
        const buyHint = i18n
          .t('exchange.recovery')
          .replace('{ticks}', String(good.buyRecoveryTicks ?? 0));
        return h(
          'div',
          { class: 'exchange-good', 'data-testid': `exchange-good-${good.resourceId}` },
          h('span', { class: 'label', text: good.resourceId }),
          h(
            'span',
            { class: 'value' },
            `${i18n.t('exchange.sell')}: ${good.sell} / ${good.baseSell}`,
          ),
          h('span', { class: 'hint', text: sellHint }),
          h('span', { class: 'value' }, `${i18n.t('exchange.buy')}: ${good.buy} / ${good.baseBuy}`),
          h('span', { class: 'hint', text: buyHint }),
          h(
            'span',
            { class: 'value' },
            `${i18n.t('exchange.volume')}: ${good.recentSold} / ${good.recentBought}`,
          ),
          h('button', {
            class: 'action',
            'data-testid': `exchange-sell-${good.resourceId}`,
            onclick: () =>
              onTrade(exchange.entityId, good.resourceId, 'sell', Math.max(1, good.recentSold)),
            text: i18n.t('exchange.trade_sell'),
          }),
          h('button', {
            class: 'action',
            'data-testid': `exchange-buy-${good.resourceId}`,
            onclick: () =>
              onTrade(exchange.entityId, good.resourceId, 'buy', Math.max(1, good.recentBought)),
            text: i18n.t('exchange.trade_buy'),
          }),
        );
      });
      const title =
        exchange.regionId === undefined
          ? `${i18n.t('exchange.node')} ${exchange.entityId}`
          : `${i18n.t('exchange.node')} ${exchange.entityId} · ${exchange.regionId}`;
      return h(
        'div',
        { class: 'exchange-node', 'data-testid': `exchange-${exchange.entityId}` },
        h('h4', { class: 'drawer-subtitle', text: title }),
        ...goods,
      );
    });
    replaceChildren(
      el,
      h('h3', { class: 'drawer-title', text: i18n.t('exchange.title') }),
      ...sections,
    );
  };

  return { el, show };
}
