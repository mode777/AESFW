/**
 * The news rail (REF-12.6). Recent newsworthy events and pending warnings,
 * newest first; clicking an entry selects its subject and jumps the camera.
 *
 * Source: REF-12.6, REF-11
 */
import { h } from '../../dom/h.js';
import type { NewsEntry } from '../../selectors/news.js';

/** A mounted news rail. */
export interface NewsRail {
  readonly el: HTMLElement;
  show(entries: readonly NewsEntry[]): void;
}

/** Creates the news rail (REF-12.6). */
export function createNewsRail(onSelect: (entry: NewsEntry) => void): NewsRail {
  const list = h('ol', { class: 'news-list', 'data-testid': 'news-list' });
  const el = h('div', { class: 'news-rail' }, h('h2', { class: 'news-title', text: 'News' }), list);

  const show = (entries: readonly NewsEntry[]): void => {
    if (entries.length === 0) {
      list.replaceChildren(
        h('li', { class: 'news-empty', 'data-testid': 'news-empty', text: '—' }),
      );
      return;
    }
    list.replaceChildren(
      ...entries.map((entry) => {
        const item = h(
          'li',
          {
            class: entry.warning ? 'news-entry news-warning' : 'news-entry',
            'data-testid': `news-entry-${entry.id}`,
            'data-warning': entry.warning ? 'true' : 'false',
          },
          h('span', { class: 'news-tick', text: `${entry.tick}` }),
          h('span', { class: 'news-text', text: entry.text }),
        );
        item.addEventListener('click', () => onSelect(entry));
        return item;
      }),
    );
  };

  show([]);
  return { el, show };
}
