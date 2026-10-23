/**
 * The economy drawer (REF-12.4). Renders the owner balance read model:
 * credits, net rate with a client-local sparkline, revenue and expenses by
 * source, idle-but-paying entities, and the deficit pause order with a
 * resume-all control.
 *
 * Source: REF-12.4, PIC-10.6
 */
import type { SessionClient } from '@aesfw/host-web/client';
import { h, replaceChildren, svg } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import { REFERENCE_BASE_SCALE } from '../selectors/economy.js';
import type { EconomyViewModel } from '../selectors/economy.js';

/** A mounted economy drawer. */
export interface EconomyView {
  readonly el: HTMLElement;
  show(model: EconomyViewModel): void;
}

const sparkline = (trend: readonly number[]): SVGElement => {
  const width = 180;
  const height = 32;
  const element = svg('svg', {
    class: 'sparkline',
    'data-testid': 'economy-sparkline',
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
  });
  if (trend.length < 2) return element;
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const span = max - min === 0 ? 1 : max - min;
  const points = trend
    .map((value, index) => {
      const x = Math.round((index * width) / (trend.length - 1));
      const y = Math.round(height - ((value - min) * height) / span);
      return `${x},${y}`;
    })
    .join(' ');
  element.append(
    svg('polyline', { points, fill: 'none', stroke: 'currentColor', 'stroke-width': 1 }),
  );
  return element;
};

/**
 * Creates the economy drawer (REF-12.4).
 *
 * Source: REF-12.4
 */
export function createEconomyView(client: SessionClient, actorId: string, i18n: I18n): EconomyView {
  const el = h('div', { class: 'drawer-panel economy', 'data-testid': 'economy-view' });

  const show = (model: EconomyViewModel): void => {
    const balance =
      model.credits === null ? '-' : i18n.formatBaseUnits(model.credits, REFERENCE_BASE_SCALE);
    const net = i18n.formatBaseUnits(model.netPerTick, REFERENCE_BASE_SCALE);
    const revenueRows = model.revenue.map((row) =>
      h(
        'div',
        { class: 'row', 'data-testid': `economy-revenue-${row.source}` },
        h('span', { class: 'label', text: i18n.t(row.source) }),
        h('span', { class: 'value', text: i18n.formatBaseUnits(row.amount, REFERENCE_BASE_SCALE) }),
      ),
    );
    const expenseRows = model.expenses.map((row) =>
      h(
        'div',
        { class: 'row', 'data-testid': `economy-expense-${row.source}` },
        h('span', { class: 'label', text: i18n.t(row.source) }),
        h('span', { class: 'value', text: i18n.formatBaseUnits(row.amount, REFERENCE_BASE_SCALE) }),
      ),
    );
    const paused = model.deficitPaused.map((entity) =>
      h(
        'div',
        { class: 'row', 'data-testid': `economy-paused-${entity}` },
        h('span', {
          class: 'label',
          text: `#${entity}`,
        }),
      ),
    );
    const resume = h('button', {
      'data-testid': 'economy-resume',
      text: i18n.t('economy.resume'),
      onclick: () =>
        client.command({
          command_id: `client-ResumeDeficitPausedEntities-${Date.now()}`,
          actor_id: actorId,
          type: 'ResumeDeficitPausedEntities',
          payload: { entities: 'all' },
        }),
    });
    replaceChildren(
      el,
      h('h3', { class: 'drawer-title', text: i18n.t('economy.title') }),
      h(
        'div',
        { class: 'row', 'data-testid': 'economy-balance' },
        h('span', { class: 'label', text: i18n.t('economy.credits') }),
        h('span', { class: 'value', text: balance }),
      ),
      h(
        'div',
        { class: 'row', 'data-testid': 'economy-net' },
        h('span', { class: 'label', text: i18n.t('economy.net') }),
        h('span', { class: model.netPerTick < 0 ? 'value attention' : 'value', text: net }),
      ),
      sparkline(model.trend),
      h('h4', { class: 'drawer-subtitle', text: i18n.t('economy.revenue') }),
      ...revenueRows,
      h('h4', { class: 'drawer-subtitle', text: i18n.t('economy.expenses') }),
      ...expenseRows,
      h(
        'div',
        { class: 'row', 'data-testid': 'economy-idle' },
        h('span', { class: 'label', text: i18n.t('economy.idle') }),
        h('span', { class: 'value', text: String(model.idlePaying.length) }),
      ),
      h('h4', { class: 'drawer-subtitle', text: i18n.t('economy.paused') }),
      ...paused,
      resume,
    );
  };

  show({
    credits: null,
    revenuePerTick: 0,
    expensesPerTick: 0,
    netPerTick: 0,
    revenue: [],
    expenses: [],
    idlePaying: [],
    deficitPaused: [],
    trend: [],
  });
  return { el, show };
}
