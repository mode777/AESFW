/**
 * Composition root (REF-14.1). Creates the worker, the session client, the
 * mirror, the view state, and the shell views.
 *
 * Source: REF-14.1, REF-14.2
 */
import { PROTOCOL_VERSION } from '@aesfw/protocol';
import type {
  DefinitionMetadataDto,
  ExchangeQuotesDto,
  EntityDetailDto,
  LocationDto,
  LocationSummaryDto,
  NeedBreakdownDto,
  PlacementResultDto,
  PlanningDto,
  TransportDetailDto,
  TransportOrderDto,
} from '@aesfw/protocol';
import { PRESENTATION, presentationEntries } from './content/presentation.js';
import { R0_CONTENT } from './content/r0.js';
import { h, replaceChildren } from './dom/h.js';
import { createFormatter } from './format/index.js';
import { createI18n } from './i18n/index.js';
import { locationBanner, resourceBar, viewedLocation } from './selectors/hud.js';
import { readClientSettings, writeClientSettings } from './store/storage.js';
import {
  archetypeOf,
  economyView,
  gridCells,
  paletteEntries,
  placeEntityPlanPayload,
  placementFootprint,
  placementKeyAction,
  placementQueryPayload,
  draftPayload,
  establishDraft,
  exploreDraft,
  logisticsView,
  planningView,
  pushTrend,
} from './selectors/index.js';
import type { Footprint, PaletteEntry, ShapeArchetype } from './selectors/index.js';
import { tradeDraft, exchangeEntities, exchangeView } from './selectors/exchange.js';
import { createWorkerClient } from './session/client.js';
import { createMirror } from './store/mirror.js';
import {
  createViewState,
  drawerAction,
  nextMode,
  toggleOverlay,
  togglePin,
} from './store/view-state.js';
import type { PlacementCursor } from './store/view-state.js';
import { coverageOverlay } from './selectors/progression.js';
import { createBuildPalette } from './views/build-palette.js';
import { createDebugOverlay } from './views/debug-overlay.js';
import { createEconomyView } from './views/economy.js';
import { createExchangeView } from './views/exchange.js';
import { createInspector } from './views/inspector.js';
import { createInventoryTable } from './views/inventory-table.js';
import { createLocationGrid } from './views/location-grid.js';
import { createPlanningView } from './views/planning.js';
import { createLogisticsView } from './views/logistics.js';
import { createProgressionView } from './views/progression.js';
import { createPopulationTable } from './views/population-table.js';
import { createActionBar } from './views/hud/action-bar.js';
import type { WindowKind } from './views/hud/action-bar.js';
import { createHudFrame } from './views/hud/frame.js';
import { createLocationBannerView } from './views/hud/location-banner.js';
import { mountMinimapPlaceholder, mountNewsPlaceholder } from './views/hud/placeholders.js';
import { createResourceBarView } from './views/hud/resource-bar.js';
import { createWindowHost } from './views/hud/window-host.js';
import { createWorldMap } from './views/world-map.js';
import type { WorldMapSelection } from './views/world-map.js';

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
  'exchange.title': 'Exchange',
  'exchange.empty': 'No known exchange',
  'exchange.node': 'Exchange',
  'exchange.sell': 'Sell',
  'exchange.buy': 'Buy',
  'exchange.volume': 'Volume sold/bought',
  'exchange.recovery': 'Recovery in {ticks} ticks',
  'exchange.trade_sell': 'Sell',
  'exchange.trade_buy': 'Buy',
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
  readonly exchange_quotes?: ExchangeQuotesDto | null;
}

/**
 * Mounts the reference client into `root` (REF-14.1).
 *
 * Source: REF-14.1, REF-13.1, REF-13.2, REF-13.3
 */
export function mount(root: HTMLElement): void {
  const { client } = createWorkerClient();
  const view = createViewState();
  const settings = readClientSettings();
  view.pins.set(settings.pins);
  view.locale.set(settings.locale);
  view.theme.set(settings.theme);
  view.camera.set(settings.camera);
  const i18n = createI18n({ ...presentationEntries(), ...CLIENT_STRINGS });
  const formatter = createFormatter({
    baseScale: PRESENTATION.formatting.base_scale,
    grouping: PRESENTATION.formatting.number.grouping,
    decimals: PRESENTATION.formatting.number.decimals,
    perMinute: PRESENTATION.formatting.rates.per_minute,
    tickDurationMs: PRESENTATION.formatting.rates.tick_duration_ms,
  });
  const metadata = { protocolVersion: PROTOCOL_VERSION, checksum: '', lastHash: '' };
  const mirror = createMirror({ requestSnapshot: () => client.subscribe(ACTOR_ID) });
  const inspector = createInspector(client, ACTOR_ID, i18n);
  const inventory = createInventoryTable(i18n);
  const population = createPopulationTable(i18n);
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
  let exchangeDefinitionIds: readonly string[] = [];
  const exchangeQuotesById = new Map<number, ExchangeQuotesDto>();
  let metadataRequest: 'palette' | 'exchange' = 'palette';
  const exchange = createExchangeView(i18n, (exchangeId, resourceId, direction, quantity) => {
    logistics.prefill(tradeDraft(exchangeId, resourceId, direction, quantity));
    view.windows.set(['logistics']);
    windowHost.open('logistics');
    refreshWindows();
  });
  const windowHost = createWindowHost();
  let trend: readonly number[] = [];
  const archetypes = new Map<string, ShapeArchetype>();
  const footprints = new Map<string, Footprint>();
  let definitions: readonly DefinitionMetadataDto[] = [];
  let palette: readonly PaletteEntry[] = [];

  const refreshWindows = (): void => {
    const open = view.windows();
    if (open.includes('economy')) {
      economy.show(economyView(mirror.projection(), ACTOR_ID, trend));
    }
    if (open.includes('planning')) {
      client.query(ACTOR_ID, { kind: 'planning' });
    }
    if (open.includes('logistics')) {
      refreshLogistics();
      client.query(ACTOR_ID, { kind: 'transport_orders' });
    }
    if (open.includes('exchange')) {
      metadataRequest = 'exchange';
      client.query(ACTOR_ID, { kind: 'definition_metadata', definition_type: 'exchange' });
      for (const id of exchangeEntities(mirror.projection(), exchangeDefinitionIds)) {
        client.query(ACTOR_ID, { kind: 'exchange_quotes', entity_id: id });
      }
      exchange.show(exchangeView([...exchangeQuotesById.values()]));
    }
    if (open.includes('population')) {
      progression.show(
        mirror.projection()?.locations ?? [],
        [...summaries.values()],
        currentDetail,
        view.location(),
      );
    }
  };

  const toggleWindow = (kind: WindowKind): void => {
    windowHost.toggle(kind);
    view.windows.set(windowHost.openKinds());
    persist();
    refreshWindows();
  };

  const persist = (): void => {
    writeClientSettings({
      camera: view.camera(),
      pins: view.pins(),
      windows: view.windows(),
      locale: view.locale(),
      theme: view.theme(),
      location: view.location(),
    });
  };

  const currentLocation = (): LocationDto | undefined => {
    const projection = mirror.projection();
    const locations = projection?.locations ?? [];
    const requested = view.location();
    const found = locations.find((entry) => entry.entity_id === requested) ?? locations[0];
    // Fog (REF-12.2): the grid needs attributes an unknown location hides.
    if (found !== undefined && found.knowledge === 'unknown') return undefined;
    return found;
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
  let mapSelection: WorldMapSelection | null = null;
  const mapActions = h('div', { class: 'map-actions', 'data-testid': 'map-actions', hidden: true });
  const renderMapActions = (): void => {
    mapActions.replaceChildren();
    if (mapSelection === null) {
      mapActions.hidden = true;
      return;
    }
    mapActions.hidden = false;
    const { locationId, knowledge, active } = mapSelection;
    const button = (testId: string, text: string, onclick: () => void): HTMLElement =>
      h('button', { 'data-testid': testId, text, onclick });
    if (knowledge !== 'unknown') {
      mapActions.append(
        button('map-activate', active ? 'Deactivate' : 'Activate', () => {
          client.command({
            command_id: `client-location-${Date.now()}`,
            actor_id: ACTOR_ID,
            type: active ? 'DeactivateLocation' : 'ActivateLocation',
            payload: { location_id: locationId },
          });
          mapSelection = null;
          renderMapActions();
        }),
      );
    }
    if (knowledge !== 'unknown') {
      mapActions.append(
        button('map-explore', 'Explore', () => {
          view.windows.set(['logistics']);
          windowHost.open('logistics');
          refreshWindows();
          logistics.prefill(exploreDraft(locationId));
          mapSelection = null;
          renderMapActions();
        }),
        button('map-establish', 'Establish', () => {
          view.windows.set(['logistics']);
          windowHost.open('logistics');
          refreshWindows();
          logistics.prefill(establishDraft(locationId));
          mapSelection = null;
          renderMapActions();
        }),
      );
    }
  };
  const worldMapView = createWorldMap(mirror, {
    onSelect: (selection) => {
      mapSelection = mapSelection?.locationId === selection.locationId ? null : selection;
      renderMapActions();
    },
  });
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
    renderMapActions();
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
        if (response.result.status === 'accepted') {
          client.query(ACTOR_ID, { kind: 'transport_orders' });
        }
        break;
      case 'query_result': {
        const result = response.result as QueryResult;
        if (result.entity_detail !== undefined) {
          currentDetail = result.entity_detail;
          inspector.show(currentDetail, currentBreakdown);
          if (view.windows().includes('population')) {
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
          if (view.windows().includes('population')) {
            progression.show(
              mirror.projection()?.locations ?? [],
              [...summaries.values()],
              currentDetail,
              view.location(),
            );
          }
        }
        if (result.definition_metadata !== undefined) {
          if (metadataRequest === 'exchange') {
            metadataRequest = 'palette';
            exchangeDefinitionIds = result.definition_metadata.map(
              (definition) => definition.definition_id,
            );
            for (const id of exchangeEntities(mirror.projection(), exchangeDefinitionIds)) {
              client.query(ACTOR_ID, { kind: 'exchange_quotes', entity_id: id });
            }
          } else {
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
        if (result.exchange_quotes !== undefined && result.exchange_quotes !== null) {
          exchangeQuotesById.set(result.exchange_quotes.entity_id, result.exchange_quotes);
          if (view.windows().includes('exchange')) {
            exchange.show(exchangeView([...exchangeQuotesById.values()]));
          }
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
    refreshWindows();
  });
  refreshWindows();
  refreshView();

  const debug = createDebugOverlay(mirror, view, metadata);
  const frame = createHudFrame();
  const resourceBarView = createResourceBarView(formatter, (resourceId) => {
    view.pins.set(togglePin(view.pins(), resourceId));
    persist();
  });
  const bannerView = createLocationBannerView();
  const actionBar = createActionBar(client, mirror, view, toggleWindow);
  mountMinimapPlaceholder(frame.regions.minimap);
  mountNewsPlaceholder(frame.regions.news);
  frame.regions.resourceBar.append(resourceBarView.el);
  frame.regions.banner.append(bannerView.el);
  frame.regions.actionBar.append(actionBar.el);

  // The context panel hosts the build palette and the map actions until 11.4c
  // and 11.4d fill it (design D2).
  frame.regions.contextPanel.append(
    mapButton,
    paletteView.el,
    h('div', { class: 'hud-lists' }, entityList, locationList),
  );
  frame.world.append(grid.el, worldMapView.el, mapActions, windowHost.el);

  for (const window of [
    { kind: 'economy', title: i18n.t('economy.title'), el: economy.el },
    { kind: 'planning', title: i18n.t('planning.title'), el: planning.el },
    { kind: 'logistics', title: 'Logistics', el: logistics.el },
    { kind: 'exchange', title: i18n.t('exchange.title'), el: exchange.el },
    { kind: 'population', title: i18n.t('progression.title'), el: progression.el },
    { kind: 'inspector', title: 'Inspector', el: inspector.el },
    {
      kind: 'tables',
      title: 'Tables',
      el: h('div', { class: 'hud-tables' }, inventory.el, population.el),
    },
  ]) {
    windowHost.register(window);
  }
  for (const kind of view.windows()) windowHost.open(kind);

  const refreshHud = (): void => {
    const projection = mirror.projection();
    const owner = projection?.owners.find((entry) => entry.owner_id === ACTOR_ID);
    const location = viewedLocation(projection, view.location());
    const summary = location === null ? null : (summaries.get(location.entity_id) ?? null);
    resourceBarView.show(resourceBar(owner, summary, definitions, view.pins(), formatter));
    bannerView.show(locationBanner(location));
    actionBar.update();
  };
  mirror.projection.subscribe(refreshHud);
  view.location.subscribe(() => {
    refreshHud();
    persist();
  });
  view.pins.subscribe(refreshHud);
  refreshHud();
  refreshWindows();

  root.append(frame.el, debug.el);

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
      windowHost.closeTop();
      view.windows.set(windowHost.openKinds());
      persist();
      return;
    }
    if (event.key === 'c' || event.key === 'C' || event.key === 's' || event.key === 'S') {
      view.overlay.set(toggleOverlay(view.overlay(), event.key));
    }
    if (event.key === 'i' || event.key === 'I') {
      toggleWindow('inspector');
      return;
    }
    if (event.key === 't' || event.key === 'T') {
      toggleWindow('tables');
      return;
    }
    if (
      event.key === 'e' ||
      event.key === 'E' ||
      event.key === 'p' ||
      event.key === 'P' ||
      event.key === 'l' ||
      event.key === 'L' ||
      event.key === 'x' ||
      event.key === 'X' ||
      event.key === 'v' ||
      event.key === 'V'
    ) {
      const next = drawerAction(null, event.key);
      if (next !== null) toggleWindow(next as WindowKind);
    }
  });

  client.init([...R0_CONTENT]);
  client.subscribe(ACTOR_ID);
}

const app = document.getElementById('app');
if (app !== null) mount(app);
