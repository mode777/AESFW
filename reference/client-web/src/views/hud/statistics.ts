/**
 * The statistics window (REF-12.4): the economy summary, the tier pyramid, and
 * capability supply. Read-only except for the deficit resume, which stays on
 * the economy view.
 *
 * Source: REF-12.4
 */
import { h } from '../../dom/h.js';
import type { StatisticsModel } from '../../selectors/statistics.js';

/** A mounted statistics view. */
export interface StatisticsView {
  readonly el: HTMLElement;
  show(model: StatisticsModel): void;
}

/** Creates the statistics window (REF-12.4). */
export function createStatisticsView(economyEl: HTMLElement): StatisticsView {
  const pyramid = h('ul', { class: 'statistics-pyramid', 'data-testid': 'statistics-pyramid' });
  const capabilities = h('ul', {
    class: 'statistics-capabilities',
    'data-testid': 'statistics-capabilities',
  });
  const el = h(
    'div',
    { class: 'statistics-window' },
    economyEl,
    h('h3', { class: 'context-section-title', text: 'Tier pyramid' }),
    pyramid,
    h('h3', { class: 'context-section-title', text: 'Capabilities' }),
    capabilities,
  );

  const show = (model: StatisticsModel): void => {
    pyramid.replaceChildren(
      ...model.pyramid.map((row) =>
        h(
          'li',
          {
            class: 'statistics-row',
            'data-testid': `pyramid-${row.scope}-${row.tierId}`,
          },
          h('span', { class: 'statistics-scope', text: row.scope }),
          h('span', { class: 'statistics-tier', text: row.tierId.split('.').at(-1) ?? row.tierId }),
          h('span', { class: 'statistics-count', text: String(row.count) }),
        ),
      ),
    );
    capabilities.replaceChildren(
      ...model.capabilities.map((row) =>
        h(
          'li',
          {
            class: 'statistics-row',
            'data-testid': `capability-${row.locationId}-${row.capabilityId}`,
          },
          h('span', { class: 'statistics-scope', text: `location ${row.locationId}` }),
          h('span', {
            class: 'statistics-tier',
            text: row.capabilityId.split('.').at(-1) ?? row.capabilityId,
          }),
          h('span', { class: 'statistics-count', text: String(row.supplied) }),
        ),
      ),
    );
  };

  return { el, show };
}
