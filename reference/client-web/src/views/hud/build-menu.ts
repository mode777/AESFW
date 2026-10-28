/**
 * The tier-tabbed build menu (REF-12.3). It renders one tab per presentation
 * category, greys locked entries with their unlock hint, and shows each entry's
 * construction costs next to the viewed location's stock. It issues no
 * commands and judges no affordability.
 *
 * Source: REF-12.3, 04 §6
 */
import { h } from '../../dom/h.js';
import type { BuildMenuTab } from '../../selectors/build-menu.js';
import type { Formatter } from '../../format/index.js';

/** A mounted build menu. */
export interface BuildMenuView {
  readonly el: HTMLElement;
  show(tabs: readonly BuildMenuTab[], selectedId: string | null): void;
}

/** Creates the build menu view (REF-12.3). */
export function createBuildMenuView(
  formatter: Formatter,
  onSelect: (definitionId: string) => void,
): BuildMenuView {
  const el = h('div', { class: 'build-menu', 'data-testid': 'build-menu' });
  let activeTab: string | null = null;

  const show = (tabs: readonly BuildMenuTab[], selectedId: string | null): void => {
    if (tabs.length === 0) {
      el.replaceChildren(
        h('p', { class: 'build-menu-empty', 'data-testid': 'build-menu-empty', text: '—' }),
      );
      return;
    }
    const current = tabs.find((tab) => tab.categoryKey === activeTab) ?? tabs[0];
    activeTab = current?.categoryKey ?? null;
    const tabStrip = h('div', { class: 'build-menu-tabs', role: 'tablist' });
    const panes = h('div', { class: 'build-menu-entries' });
    for (const tab of tabs) {
      const selected = tab.categoryKey === current?.categoryKey;
      tabStrip.append(
        h('button', {
          class: selected ? 'build-tab build-tab-active' : 'build-tab',
          role: 'tab',
          'aria-selected': selected ? 'true' : 'false',
          'data-testid': `build-tab-${tab.categoryKey}`,
          text: tab.label,
          onclick: () => {
            activeTab = tab.categoryKey;
            show(tabs, selectedId);
          },
        }),
      );
      if (!selected) continue;
      for (const entry of tab.entries) {
        const costs = entry.costs
          .map(
            (cost, index) =>
              `${i18nLabel(cost.resourceId)} ${formatter.format(cost.quantity)} / ${formatter.format(
                entry.stock[index]?.quantity ?? 0,
              )}`,
          )
          .join(' · ');
        const button = h('button', {
          class: [
            'build-entry',
            entry.definitionId === selectedId ? 'build-entry-selected' : '',
            entry.locked ? 'build-entry-locked' : '',
          ]
            .filter(Boolean)
            .join(' '),
          'data-testid': `build-entry-${entry.definitionId}`,
          'data-archetype': entry.archetype,
          'data-locked': entry.locked ? 'true' : 'false',
          'aria-disabled': entry.locked ? 'true' : 'false',
          ...(entry.locked && entry.unlockHint !== null ? { title: entry.unlockHint } : {}),
          disabled: entry.locked,
        });
        button.append(
          h('span', { class: 'build-entry-label', text: entry.label }),
          h('span', {
            class: 'build-entry-cost',
            'data-testid': `build-cost-${entry.definitionId}`,
            text: costs,
          }),
          ...(entry.locked && entry.unlockHint !== null
            ? [h('span', { class: 'build-entry-hint', text: entry.unlockHint })]
            : []),
        );
        button.addEventListener('click', () => {
          if (entry.locked) return;
          onSelect(entry.definitionId);
        });
        panes.append(button);
      }
    }
    el.replaceChildren(tabStrip, panes);
  };

  const i18nLabel = (resourceId: string): string =>
    resourceId.split('.').at(-1)?.toUpperCase() ?? resourceId;

  show([], null);
  return { el, show };
}
