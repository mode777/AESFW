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
  LocationDto,
  LocationSummaryDto,
  NeedBreakdownDto,
  PlacementResultDto,
  PlanningDto,
  TransportDetailDto,
  TransportOrderDto,
} from '@aesfw/protocol';
import { R0_CONTENT } from './content/r0.js';
import { h, replaceChildren } from './dom/h.js';
import { createI18n } from './i18n/index.js';
import {
  archetypeOf,
  commandNotice,
  economyView,
  gridCells,
  paletteEntries,
  placeEntityPlanPayload,
  placementFootprint,
  placementKeyAction,
  placementQueryPayload,
  draftPayload,
  logisticsView,
  planningView,
  pushTrend,
} from './selectors/index.js';
import type { Footprint, PaletteEntry, ShapeArchetype } from './selectors/index.js';
import { createWorkerClient } from './session/client.js';
import { createMirror } from './store/mirror.js';
import { createViewState, drawerAction, nextMode, toggleOverlay } from './store/view-state.js';
import type { PlacementCursor } from './store/view-state.js';
import { coverageOverlay } from './selectors/progression.js';
import { createBuildPalette } from './views/build-palette.js';
import { createDebugOverlay } from './views/debug-overlay.js';
import { createEconomyView } from './views/economy.js';
import { createInspector } from './views/inspector.js';
import { createInventoryTable } from './views/inventory-table.js';
import { createLocationGrid } from './views/location-grid.js';
import { createNotice } from './views/notice.js';
import { createPlanningView } from './views/planning.js';
import { createLogisticsView } from './views/logistics.js';
import { createProgressionView } from './views/progression.js';
import { createPopulationTable } from './views/population-table.js';
import { createTopBar } from './views/top-bar.js';
import { createWorldMap } from './views/world-map.js';

const ACTOR_ID = 'owner.0';
const SUITABILITY_PROPERTY = 'ref.tier.property.suitability_p1';

const CLIENT_STRINGS: Readonly<Record<string, string>> = {
  'grid.no_location': 'No location',
  'grid.no_grid': 'No grid',
  'overlay.connectivity': 'Connectivity',
  'overlay.suitability': 'Suitability',
  'overlay.throughput': 'Throughput',
  'palette.title': 'Build',
  'mode.inspect': 'inspect',
  'mode.place': 'place',
  'mode.route-edit': 'route-edit',
  'placement.unknown': 'preview',
  'placement.valid': 'valid',
  'placement.invalid': 'invalid',
  'command.rejected': 'Command rejected',
  'economy.title': 'Economy',
  'economy.credits': 'Credits',
  'economy.net': 'Net',
  'economy.revenue': 'Revenue',
  'economy.expenses': 'Expenses',
  'economy.idle': 'Idle paying',
  'economy.paused': 'Deficit paused',
  'economy.resume': 'Resume all',
  'planning.title': 'Planning',
  'planning.tiers': 'Supported population',
  'planning.chains': 'Chains',
  'planning.net': 'net',
  'planning.supported': 'supported',
  'planning.population': 'population',
  'planning.coverage': 'coverage',
  'planning.output': 'output',
  'progression.title': 'Population',
  'progression.location': 'Location',
  'progression.transitions': 'Transitions',
  'progression.eligible': 'eligible',
  'progression.ineligible': 'ineligible',
  'progression.advance': 'Advance',
  'progression.locks': 'Purpose locks',
  'progression.lock': 'Lock',
  'progression.unlock': 'Unlock',
  'overlay.coverage': 'Coverage',
  'planning.maintenance': 'maintenance',
};

interface QueryResult {
  readonly entity_detail?: EntityDetailDto | null;
  readonly need_breakdown?: readonly NeedBreakdownDto[];
  readonly location_summary?: LocationSummaryDto | null;
  readonly definition_metadata?: readonly DefinitionMetadataDto[];
  readonly placement_result?: PlacementResultDto | null;
  readonly planning?: PlanningDto;
  readonly transport_detail?: TransportDetailDto | null;
  readonly transport_orders?: readonly TransportOrderDto[];
}

/**
 * Mounts the reference client into `root` (REF-14.1).
 *
 * Source: REF-14.1, REF-13.1, REF-13.2, REF-13.3
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
  const notice = createNotice();
  const economy = createEconomyView(client, ACTOR_ID, i18n);
  const planning = createPlanningView(i18n);
  let transportOrderList: readonly TransportOrderDto[] = [];
  let transportDetailModel: TransportDetailDto | null = null;
  const refreshLogistics = (): void => {
    logistics.show(
      logisticsView(mirror.projection(), transportOrderList, transportDetailModel, null),
    );
  };
  const progression = createProgressionView(client, ACTOR_ID, i18n);
  const logistics = createLogisticsView({
    onCreate: (draft) => {
      client.command({
        command_id: `client-order-${Date.now()}`,
        actor_id: ACTOR_ID,
        type: 'CreateTransportOrder',
        payload: draftPayload(draft),
      });
    },
    onModify: (orderId, draft) => {
      client.command({
        command_id: `client-order-modify-${Date.now()}`,
        actor_id: ACTOR_ID,
        type: 'ModifyTransportOrder',
        payload: { order_id: orderId, ...draftPayload(draft) },
      });
    },
    onDelete: (orderId) => {
      client.command({
        command_id: `client-order-delete-${Date.now()}`,
        actor_id: ACTOR_ID,
        type: 'DeleteTransportOrder',
        payload: { order_id: orderId },
      });
    },
    onAssign: (unitId, orderId) => {
      client.command({
        command_id: `client-order-assign-${Date.now()}`,
        actor_id: ACTOR_ID,
        type: 'AssignTransport',
        payload: { unit_id: unitId, order_id: orderId },
      });
    },
    onUnassign: (unitId) => {
      client.command({
        command_id: `client-order-unassign-${Date.now()}`,
        actor_id: ACTOR_ID,
        type: 'UnassignTransport',
        payload: { unit_id: unitId },
      });
    },
    onSelectUnit: (unitId) => {
      client.query(ACTOR_ID, { kind: 'transport_detail', entity_id: unitId });
    },
  });
  const drawer = h(
    'div',
    { class: 'drawer', 'data-testid': 'drawer' },
    economy.el,
    planning.el,
    logistics.el,
    progression.el,
  );
  let trend: readonly number[] = [];
  const archetypes = new Map<string, ShapeArchetype>();
  const footprints = new Map<string, Footprint>();
  let definitions: readonly DefinitionMetadataDto[] = [];
  let palette: readonly PaletteEntry[] = [];

  const refreshDrawer = (): void => {
    const kind = view.drawer();
    economy.el.hidden = kind !== 'economy';
    planning.el.hidden = kind !== 'planning';
    logistics.el.hidden = kind !== 'logistics';
    progression.el.hidden = kind !== 'population';
    drawer.hidden = kind === null;
    if (kind === 'economy') {
      economy.show(economyView(mirror.projection(), ACTOR_ID, trend));
    }
    if (kind === 'planning') {
      client.query(ACTOR_ID, { kind: 'planning' });
    }
    if (kind === 'logistics') {
      refreshLogistics();
      client.query(ACTOR_ID, { kind: 'transport_orders' });
    }
    if (kind === 'population') {
      progression.show(
        mirror.projection()?.locations ?? [],
        [...summaries.values()],
        currentDetail,
        view.location(),
      );
    }
  };

  const setDrawer = (kind: 'economy' | 'planning'): void => {
    view.drawer.set(view.drawer() === kind ? null : kind);
    refreshDrawer();
  };

  const currentLocation = (): LocationDto | undefined => {
    const projection = mirror.projection();
    const locations = projection?.locations ?? [];
    const requested = view.location();
    return locations.find((entry) => entry.entity_id === requested) ?? locations[0];
  };

  const gridBounds = (): { width: number; height: number } | null => {
    const location = currentLocation();
    if (location === undefined) return null;
    const model = gridCells(location);
    return model === null ? null : { width: model.width, height: model.height };
  };

  const requestPlacementQuery = (): void => {
    const location = currentLocation();
    if (location === undefined) return;
    const payload = placementQueryPayload(view.placement(), location.entity_id);
    if (payload === null) return;
    client.query(ACTOR_ID, payload);
  };

  let framePending = false;
  const schedulePlacementQuery = (): void => {
    if (framePending) return;
    framePending = true;
    const run = (): void => {
      framePending = false;
      requestPlacementQuery();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
    else run();
  };

  const startPlacement = (definitionId: string): void => {
    const bounds = gridBounds();
    const current = view.placement();
    const position: readonly [number, number] =
      bounds === null
        ? current.position
        : [Math.floor((bounds.width - 1) / 2), Math.floor((bounds.height - 1) / 2)];
    view.mode.set('place');
    view.placement.set({
      definitionId,
      position,
      orientation: current.orientation,
      result: null,
    });
    paletteView.show(palette, definitionId);
    schedulePlacementQuery();
  };

  const setCursor = (cursor: PlacementCursor): void => {
    view.placement.set(cursor);
    schedulePlacementQuery();
  };

  const cancelPlacement = (): void => {
    const current = view.placement();
    view.mode.set('inspect');
    view.placement.set({ ...current, definitionId: null, result: null });
    paletteView.show(palette, null);
  };

  const submitPlacement = (): void => {
    const location = currentLocation();
    if (location === undefined) return;
    const payload = placeEntityPlanPayload(view.placement(), location.entity_id);
    if (payload === null) return;
    client.command({
      command_id: `client-place-${Date.now()}`,
      actor_id: ACTOR_ID,
      type: 'PlaceEntityPlan',
      payload,
    });
  };

  const paletteView = createBuildPalette((definitionId) => startPlacement(definitionId));
  const grid = createLocationGrid(mirror, view, i18n, {
    archetypes: () => archetypes,
    footprints: () => footprints,
    coverage: () => coverageOverlay(mirror.projection(), definitions),
    propertyId: SUITABILITY_PROPERTY,
    onCursorMove: (position) => {
      const current = view.placement();
      if (position[0] === current.position[0] && position[1] === current.position[1]) return;
      setCursor({ ...current, position, result: null });
    },
    onConfirm: () => submitPlacement(),
  });
  const worldMapView = createWorldMap(mirror);
  const mapButton = h('button', {
    class: 'map-toggle',
    'data-testid': 'map-toggle',
    text: 'Map',
    onclick: () => toggleMap(),
  });
  const refreshView = (): void => {
    const showMap = view.worldMap();
    grid.el.hidden = showMap;
    worldMapView.el.hidden = !showMap;
    mapButton.textContent = showMap ? 'Grid' : 'Map';
    if (showMap) worldMapView.update();
  };
  const toggleMap = (): void => {
    view.worldMap.set(!view.worldMap());
    refreshView();
  };
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
    worldMapView.update();
    refreshLogistics();
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
      case 'command_result':
        notice.show(commandNotice(response.result, i18n));
        if (response.result.status === 'accepted') {
          client.query(ACTOR_ID, { kind: 'transport_orders' });
        }
        break;
      case 'query_result': {
        const result = response.result as QueryResult;
        if (result.entity_detail !== undefined) {
          currentDetail = result.entity_detail;
          inspector.show(currentDetail, currentBreakdown);
          if (view.drawer() === 'population') {
            progression.show(
              mirror.projection()?.locations ?? [],
              [...summaries.values()],
              currentDetail,
              view.location(),
            );
          }
        }
        if (result.need_breakdown !== undefined) {
          currentBreakdown = result.need_breakdown;
          inspector.show(currentDetail, currentBreakdown);
        }
        if (result.location_summary !== undefined && result.location_summary !== null) {
          summaries.set(result.location_summary.entity_id, result.location_summary);
          population.show([...summaries.values()]);
          if (view.drawer() === 'population') {
            progression.show(
              mirror.projection()?.locations ?? [],
              [...summaries.values()],
              currentDetail,
              view.location(),
            );
          }
        }
        if (result.definition_metadata !== undefined) {
          definitions = result.definition_metadata;
          for (const definition of result.definition_metadata) {
            archetypes.set(definition.definition_id, archetypeOf(definition));
            const footprint = placementFootprint(definition);
            if (footprint !== null) footprints.set(definition.definition_id, footprint);
          }
          palette = paletteEntries(result.definition_metadata, i18n);
          paletteView.show(palette, view.placement().definitionId);
          grid.update();
        }
        if (result.planning !== undefined) {
          planning.show(planningView(result.planning));
        }
        if (result.transport_orders !== undefined) {
          transportOrderList = result.transport_orders;
          refreshLogistics();
        }
        if (result.transport_detail !== undefined) {
          transportDetailModel = result.transport_detail;
          refreshLogistics();
        }
        if (result.placement_result !== undefined) {
          const placement = view.placement();
          view.placement.set({ ...placement, result: result.placement_result });
        }
        break;
      }
      default:
        break;
    }
  });

  mirror.projection.subscribe(() => {
    const model = economyView(mirror.projection(), ACTOR_ID, trend);
    trend = pushTrend(trend, model.netPerTick);
    refreshDrawer();
  });
  refreshDrawer();
  refreshView();

  const topBar = createTopBar(client, mirror, view, i18n, setDrawer);
  const debug = createDebugOverlay(mirror, view, metadata);
  const panels = h(
    'div',
    { class: 'panels' },
    h(
      'aside',
      { class: 'navigator' },
      entityList,
      locationList,
      h('h3', { class: 'palette-title', text: i18n.t('palette.title') }),
      mapButton,
      paletteView.el,
    ),
    h('main', { class: 'canvas' }, grid.el, worldMapView.el),
    inspector.el,
    inventory.el,
    population.el,
    drawer,
  );
  root.append(topBar.el, panels, notice.el, debug.el);

  document.addEventListener('keydown', (event) => {
    if (event.key === '`') view.debug.set(!view.debug());
    if (event.key === 'm' || event.key === 'M') {
      toggleMap();
      return;
    }
    if (view.mode() === 'place') {
      const bounds = gridBounds();
      if (bounds !== null) {
        const action = placementKeyAction(view.placement(), event.key, bounds);
        if (action.kind !== 'none') {
          event.preventDefault();
          if (action.kind === 'confirm') submitPlacement();
          else if (action.kind === 'cancel') cancelPlacement();
          else setCursor(action.cursor);
          return;
        }
      }
    }
    if (event.key === 'b' || event.key === 'B') {
      const next = nextMode(view.mode(), event.key);
      view.mode.set(next);
      if (next === 'place' && view.placement().definitionId === null && palette[0] !== undefined) {
        startPlacement(palette[0].definitionId);
      }
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      client.control('run');
    }
    if (event.key === 'Escape') {
      cancelPlacement();
      view.overlay.set(null);
    }
    if (event.key === 'c' || event.key === 'C' || event.key === 's' || event.key === 'S') {
      view.overlay.set(toggleOverlay(view.overlay(), event.key));
    }
    if (
      event.key === 'e' ||
      event.key === 'E' ||
      event.key === 'p' ||
      event.key === 'P' ||
      event.key === 'l' ||
      event.key === 'L'
    ) {
      const next = drawerAction(view.drawer(), event.key);
      if (next !== view.drawer()) {
        view.drawer.set(next);
        refreshDrawer();
      }
    }
  });

  client.init([...R0_CONTENT]);
  client.subscribe(ACTOR_ID);
}

const app = document.getElementById('app');
if (app !== null) mount(app);
