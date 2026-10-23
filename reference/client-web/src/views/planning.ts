/**
 * The planning drawer (REF-12.4). Renders the planning read model: per
 * resource and tier the net rate, per-capita demand, supported population,
 * population, and coverage; and the chain table with stage counts and integer
 * ratios.
 *
 * Source: REF-12.4, PIC-10.5
 */
import { h, replaceChildren } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import type { PlanningViewModel } from '../selectors/planning-view.js';

/** A mounted planning drawer. */
export interface PlanningView {
  readonly el: HTMLElement;
  show(model: PlanningViewModel): void;
}

/**
 * Creates the planning drawer (REF-12.4).
 *
 * Source: REF-12.4
 */
export function createPlanningView(i18n: I18n): PlanningView {
  const el = h('div', { class: 'drawer-panel planning', 'data-testid': 'planning-view' });

  const show = (model: PlanningViewModel): void => {
    const tierRows = model.tierRows.map((row) =>
      h(
        'div',
        {
          class: 'row',
          'data-testid': `planning-tier-${row.resourceId}-${row.tierId}`,
        },
        h('span', { class: 'label', text: `${i18n.t(row.resourceId)} · ${i18n.t(row.tierId)}` }),
        h('span', {
          class: 'value',
          text: `${i18n.t('planning.net')} ${row.netPerTick} · ${i18n.t('planning.supported')} ${row.supported} · ${i18n.t('planning.population')} ${row.population} · ${i18n.t('planning.coverage')} ${row.coveragePermille}`,
        }),
      ),
    );
    const chainRows = model.chainRows.map((row) =>
      h(
        'div',
        {
          class: 'row',
          'data-testid': `planning-chain-${row.resourceId}-${row.definitionId}`,
        },
        h('span', {
          class: 'label',
          text: `${i18n.t(row.resourceId)} · ${i18n.t(row.definitionId)}`,
        }),
        h('span', {
          class: 'value',
          text: `${row.count}× (${row.ratio}) · ${i18n.t('planning.output')} ${row.outputPerTick} · ${i18n.t('planning.maintenance')} ${row.maintenancePerInterval}`,
        }),
      ),
    );
    replaceChildren(
      el,
      h('h3', { class: 'drawer-title', text: i18n.t('planning.title') }),
      h('h4', { class: 'drawer-subtitle', text: i18n.t('planning.tiers') }),
      ...tierRows,
      h('h4', { class: 'drawer-subtitle', text: i18n.t('planning.chains') }),
      ...chainRows,
    );
  };

  show({ tierRows: [], chainRows: [] });
  return { el, show };
}
