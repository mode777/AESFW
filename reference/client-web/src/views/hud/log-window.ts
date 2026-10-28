/**
 * The event log window (REF-12.4, PIC-11): filter by type, click a line to
 * select its subject. The log is a client-side ring of received events; it is
 * never authoritative state.
 *
 * Source: REF-12.4, PIC-11
 */
import { h } from '../../dom/h.js';
import type { LogFilter, LogLine } from '../../selectors/log.js';
import { NO_LOG_FILTER } from '../../selectors/log.js';

/** A mounted log view. */
export interface LogView {
  readonly el: HTMLElement;
  show(lines: readonly LogLine[], types: readonly string[]): void;
  /** The active filter, for tests and the host. */
  filter(): LogFilter;
}

/** Creates the log view (REF-12.4). */
export function createLogView(onSelect: (entity: number) => void): LogView {
  let filter: LogFilter = NO_LOG_FILTER;
  const typeSelect = h('select', {
    'data-testid': 'log-filter-type',
    'aria-label': 'Event type',
  });
  typeSelect.addEventListener('change', () => {
    filter = { ...filter, type: (typeSelect as HTMLSelectElement).value || null };
  });
  const rows = h('ol', { class: 'log-lines', 'data-testid': 'log-lines' });
  const el = h(
    'div',
    { class: 'log-window' },
    h('label', { class: 'log-filter' }, 'Type', typeSelect),
    rows,
  );

  const show = (lines: readonly LogLine[], types: readonly string[]): void => {
    const current = (typeSelect as HTMLSelectElement).value;
    typeSelect.replaceChildren(
      h('option', { value: '', text: 'all' }),
      ...types.map((type) => h('option', { value: type, text: type })),
    );
    (typeSelect as HTMLSelectElement).value = current;
    rows.replaceChildren(
      ...lines.map((line) => {
        const item = h(
          'li',
          {
            class: 'log-line',
            'data-testid': `log-line-${line.tick}-${line.sequence}`,
            'data-type': line.type,
          },
          h('span', { class: 'log-tick', text: `${line.tick}` }),
          h('span', { class: 'log-text', text: line.text }),
        );
        item.addEventListener('click', () => {
          const subject = line.subjects[0];
          if (subject !== undefined) onSelect(subject);
        });
        return item;
      }),
    );
  };

  return { el, show, filter: () => filter };
}
