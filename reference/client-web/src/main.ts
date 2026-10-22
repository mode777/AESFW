/**
 * Composition root (REF-14.1). Creates the worker, the session client, the
 * mirror, the view state, and the shell views.
 *
 * Source: REF-14.1, REF-14.2
 */
import { PROTOCOL_VERSION } from '@aesfw/protocol';
import type { EntityDetailDto, LocationSummaryDto, NeedBreakdownDto } from '@aesfw/protocol';
import { R0_CONTENT } from './content/r0.js';
import { h, replaceChildren } from './dom/h.js';
import { createI18n } from './i18n/index.js';
import { createWorkerClient } from './session/client.js';
import { createMirror } from './store/mirror.js';
import { createViewState } from './store/view-state.js';
import { createDebugOverlay } from './views/debug-overlay.js';
import { createInspector } from './views/inspector.js';
import { createInventoryTable } from './views/inventory-table.js';
import { createPopulationTable } from './views/population-table.js';
import { createTopBar } from './views/top-bar.js';

const ACTOR_ID = 'owner.0';

interface QueryResult {
  readonly entity_detail?: EntityDetailDto | null;
  readonly need_breakdown?: readonly NeedBreakdownDto[];
  readonly location_summary?: LocationSummaryDto | null;
}

/**
 * Mounts the reference client into `root` (REF-14.1).
 *
 * Source: REF-14.1
 */
export function mount(root: HTMLElement): void {
  const { client } = createWorkerClient();
  const view = createViewState();
  const i18n = createI18n({});
  const metadata = { protocolVersion: PROTOCOL_VERSION, checksum: '', lastHash: '' };
  const mirror = createMirror({ requestSnapshot: () => client.subscribe(ACTOR_ID) });
  const inspector = createInspector(client, ACTOR_ID, i18n);
  const inventory = createInventoryTable(i18n);
  const population = createPopulationTable(i18n);
  const entityList = h('div', { class: 'entity-list', 'data-testid': 'entity-list' });

  let currentDetail: EntityDetailDto | null = null;
  let currentBreakdown: readonly NeedBreakdownDto[] = [];
  const summaries = new Map<number, LocationSummaryDto>();

  const select = (entity: number): void => {
    view.selection.set(entity);
    client.query(ACTOR_ID, { kind: 'entity_detail', entity_id: entity });
    client.query(ACTOR_ID, { kind: 'need_breakdown', entity_id: entity });
  };

  const refreshLists = (): void => {
    const projection = mirror.projection();
    const entities = projection?.entities ?? [];
    replaceChildren(
      entityList,
      ...entities.map((entity) =>
        h('button', {
          class: 'entity-item',
          'data-testid': `entity-item-${entity.entity_id}`,
          text: `${entity.entity_id} ${entity.definition_id ?? ''}`.trim(),
          onclick: () => select(entity.entity_id),
        }),
      ),
    );
    inventory.show(projection);
    for (const location of projection?.locations ?? []) {
      client.query(ACTOR_ID, { kind: 'location_summary', location_id: location.entity_id });
    }
    const selected = view.selection();
    if (selected !== null) {
      client.query(ACTOR_ID, { kind: 'entity_detail', entity_id: selected });
      client.query(ACTOR_ID, { kind: 'need_breakdown', entity_id: selected });
    }
  };

  client.onMessage((response) => {
    switch (response.kind) {
      case 'ready':
        metadata.checksum = response.configuration_checksum;
        break;
      case 'snapshot':
        mirror.applySnapshot(response.snapshot);
        refreshLists();
        break;
      case 'delta':
        if (response.hash !== undefined) metadata.lastHash = response.hash;
        mirror.applyDelta(response.delta, response.events);
        refreshLists();
        break;
      case 'query_result': {
        const result = response.result as QueryResult;
        if (result.entity_detail !== undefined) {
          currentDetail = result.entity_detail;
          inspector.show(currentDetail, currentBreakdown);
        }
        if (result.need_breakdown !== undefined) {
          currentBreakdown = result.need_breakdown;
          inspector.show(currentDetail, currentBreakdown);
        }
        if (result.location_summary !== undefined && result.location_summary !== null) {
          summaries.set(result.location_summary.entity_id, result.location_summary);
          population.show([...summaries.values()]);
        }
        break;
      }
      default:
        break;
    }
  });

  const topBar = createTopBar(client, mirror, view);
  const debug = createDebugOverlay(mirror, view, metadata);
  const panels = h(
    'div',
    { class: 'panels' },
    h('aside', { class: 'navigator' }, entityList),
    inspector.el,
    inventory.el,
    population.el,
  );
  root.append(topBar.el, panels, debug.el);

  document.addEventListener('keydown', (event) => {
    if (event.key === '`') view.debug.set(!view.debug());
    if (event.key === ' ') {
      event.preventDefault();
      client.control('run');
    }
  });

  client.init([...R0_CONTENT]);
  client.subscribe(ACTOR_ID);
}

const app = document.getElementById('app');
if (app !== null) mount(app);
