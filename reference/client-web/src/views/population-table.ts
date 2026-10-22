/**
 * The population table (REF-12.4). Renders per-location population totals by
 * tier from the location summaries.
 *
 * Source: REF-12.4
 */
import type { LocationSummaryDto } from '@aesfw/protocol';
import { h, replaceChildren } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import { populationRows } from '../selectors/index.js';

/** A mounted population table. */
export interface PopulationTable {
  readonly el: HTMLElement;
  show(summaries: readonly LocationSummaryDto[]): void;
}

/**
 * Creates the population table (REF-12.4).
 *
 * Source: REF-12.4
 */
export function createPopulationTable(i18n: I18n): PopulationTable {
  const el = h('div', { class: 'table population', 'data-testid': 'population-table' });
  const show = (summaries: readonly LocationSummaryDto[]): void => {
    const rows = populationRows(summaries, i18n).map((row) =>
      h(
        'div',
        { class: 'row', 'data-testid': `population-row-${row.location}-${row.tier}` },
        h('span', { class: 'label', text: `${row.location} ${row.tier}` }),
        h('span', { class: 'value', text: String(row.count) }),
      ),
    );
    replaceChildren(el, ...rows);
  };
  show([]);
  return { el, show };
}
