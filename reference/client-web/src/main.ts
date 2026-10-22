/**
 * Composition root (REF-14.1). Creates the worker, the session client, the
 * mirror, the view state, and the shell views.
 *
 * Source: REF-14.1, REF-14.2
 */
import { PROTOCOL_VERSION } from '@aesfw/protocol';
import type {
  DefinitionMetadataDto,
  EntityDetailDto,
  LocationSummaryDto,
  NeedBreakdownDto,
} from '@aesfw/protocol';
import { R0_CONTENT } from './content/r0.js';
import { h, replaceChildren } from './dom/h.js';
import { createI18n } from './i18n/index.js';
import { archetypeOf } from './selectors/index.js';
import type { ShapeArchetype } from './selectors/index.js';
import { createWorkerClient } from './session/client.js';
import { createMirror } from './store/mirror.js';
import { createViewState, toggleOverlay } from './store/view-state.js';
import { createDebugOverlay } from './views/debug-overlay.js';
import { createInspector } from './views/inspector.js';
import { createInventoryTable } from './views/inventory-table.js';
import { createLocationGrid } from './views/location-grid.js';
import { createPopulationTable } from './views/population-table.js';
import { createTopBar } from './views/top-bar.js';

const ACTOR_ID = 'owner.0';
const SUITABILITY_PROPERTY = 'ref.tier.property.suitability_p1';

const CLIENT_STRINGS: Readonly<Record<string, string>> = {
  'grid.no_location': 'No location',
  'grid.no_grid': 'No grid',
  'overlay.connectivity': 'Connectivity',
  'overlay.suitability': 'Suitability',
};

interface QueryResult {
  readonly entity_detail?: EntityDetailDto | null;
  readonly need_breakdown?: readonly NeedBreakdownDto[];
  readonly location_summary?: LocationSummaryDto | null;
  readonly definition_metadata?: readonly DefinitionMetadataDto[];
}

/**
 * Mounts the reference client into `root` (REF-14.1).
 *
 * Source: REF-14.1
 */
export function mount(root: HTMLElement): void {
  const { client } = createWorkerClient();
  const view = createViewState();
  const i18n = createI18n(CLIENT_STRINGS);
  const metadata = { protocolVersion: PROTOCOL_VERSION, checksum: '', lastHash: '' };
  const mirror = createMirror({ requestSnapshot: () => client.subscribe(ACTOR_ID) });
  const inspector = createInspector(client, ACTOR_ID, i18n);
  const inventory = createInventoryTable(i18n);
  const population = createPopulationTable(i18n);
  const archetypes = new Map<string, ShapeArchetype>();
  const grid = createLocationGrid(mirror, view, i18n, () => archetypes, SUITABILITY_PROPERTY);
  const entityList = h('div', { class: 'entity-list', 'data-testid': 'entity-list' });
  const locationList = h('div', { class: 'location-list', 'data-testid': 'location-list' });

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
    const locations = projection?.locations ?? [];
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
    replaceChildren(
      locationList,
      ...locations.map((location) =>
        h('button', {
          class: 'location-item',
          'data-testid': `location-item-${location.entity_id}`,
          text: `${location.entity_id} ${location.definition_id ?? ''}`.trim(),
          onclick: () => view.location.set(location.entity_id),
        }),
      ),
    );
    if (view.location() === null && locations[0] !== undefined) {
      view.location.set(locations[0].entity_id);
    }
    inventory.show(projection);
    for (const location of locations) {
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
        client.query(ACTOR_ID, { kind: 'definition_metadata', definition_type: 'entity' });
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
        if (result.definition_metadata !== undefined) {
          for (const definition of result.definition_metadata) {
            archetypes.set(definition.definition_id, archetypeOf(definition));
          }
          grid.update();
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
    h('aside', { class: 'navigator' }, entityList, locationList),
    h('main', { class: 'canvas' }, grid.el),
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
    if (event.key === 'Escape') view.overlay.set(null);
    if (event.key === 'c' || event.key === 'C' || event.key === 's' || event.key === 'S') {
      view.overlay.set(toggleOverlay(view.overlay(), event.key));
    }
  });

  client.init([...R0_CONTENT]);
  client.subscribe(ACTOR_ID);
}

const app = document.getElementById('app');
if (app !== null) mount(app);
