/**
 * The inventory table (REF-12.4). Renders each location's inventory entries.
 *
 * Source: REF-12.4
 */
import type { SnapshotDto } from '@aesfw/protocol';
import { h, replaceChildren } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import { inventoryRows } from '../selectors/index.js';

/** A mounted inventory table. */
export interface InventoryTable {
  readonly el: HTMLElement;
  show(projection: SnapshotDto | null): void;
}

/**
 * Creates the inventory table (REF-12.4).
 *
 * Source: REF-12.4
 */
export function createInventoryTable(i18n: I18n): InventoryTable {
  const el = h('div', { class: 'table inventory', 'data-testid': 'inventory-table' });
  const show = (projection: SnapshotDto | null): void => {
    if (projection === null) {
      replaceChildren(el, h('p', { text: 'no data' }));
      return;
    }
    const rows: HTMLElement[] = [];
    for (const location of projection.locations) {
      for (const row of inventoryRows(location, i18n)) {
        rows.push(
          h(
            'div',
            { class: 'row', 'data-testid': `inventory-row-${location.entity_id}-${row.resource}` },
            h('span', { class: 'label', text: `${location.entity_id} ${row.resource}` }),
            h('span', { class: 'value', text: `${row.stored} / ${row.capacity ?? '-'}` }),
          ),
        );
      }
    }
    replaceChildren(el, ...rows);
  };
  show(null);
  return { el, show };
}
