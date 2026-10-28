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
import {
  DETAIL_ZOOM,
  LOCATION_ZOOM,
  clampCamera,
  homeCamera,
  panBy,
  zoomAround,
} from './selectors/camera.js';
import { zoomLevel } from './selectors/camera.js';
import { worldLayout } from './selectors/layout.js';
import { logLines, logTypes } from './selectors/log.js';
import { statisticsView } from './selectors/statistics.js';
import { buildMenu } from './selectors/build-menu.js';
import { contextPanel } from './selectors/context-panel.js';
import type { PanelAction } from './selectors/context-panel.js';
import { dragPath } from './selectors/drag.js';
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
import { createBuildMenuView } from './views/hud/build-menu.js';
import { createContextPanelView } from './views/hud/context-panel.js';
import { createLogView } from './views/hud/log-window.js';
import { createStatisticsView } from './views/hud/statistics.js';
import { createDebugOverlay } from './views/debug-overlay.js';
import { createEconomyView } from './views/economy.js';
import { createExchangeView } from './views/exchange.js';
import { createInventoryTable } from './views/inventory-table.js';
import { createLocationGrid } from './views/location-grid.js';
import { createPlanningView } from './views/planning.js';
import { createLogisticsView } from './views/logistics.js';
import { createPopulationTable } from './views/population-table.js';
import { createActionBar } from './views/hud/action-bar.js';
import type { WindowKind } from './views/hud/action-bar.js';
import { createHudFrame } from './views/hud/frame.js';
import { createLocationBannerView } from './views/hud/location-banner.js';
import { mountNewsPlaceholder } from './views/hud/placeholders.js';
import { createResourceBarView } from './views/hud/resource-bar.js';
import { createWindowHost } from './views/hud/window-host.js';
import { createWorldCanvas } from './views/world/canvas.js';
import { createMinimap } from './views/world/minimap.js';

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
    if (open.includes('statistics')) {
      statisticsView_.show(statisticsView(mirror.projection(), ACTOR_ID, [...summaries.values()]));
      economy.show(economyView(mirror.projection(), ACTOR_ID, trend));
    }
    if (open.includes('log')) {
      logView_.show(logLines(mirror.events()), logTypes(mirror.events()));
    }
    if (open.includes('planning')) {
      client.query(ACTOR_ID, { kind: 'planning' });
    }
    if (open.includes('routes')) {
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
    panelTarget = 'build';
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
    showBuildMenu(definitionId);
    schedulePlacementQuery();
  };

  const setCursor = (cursor: PlacementCursor): void => {
    view.placement.set(cursor);
    schedulePlacementQuery();
  };

  const cancelPlacement = (): void => {
    panelTarget = 'build';
    const current = view.placement();
    view.mode.set('inspect');
    view.placement.set({ ...current, definitionId: null, result: null });
    showBuildMenu(null);
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

  let panelTarget: 'build' | 'entity' | 'location' = 'location';
  let transportDetail: TransportDetailDto | null = null;
  const contextView = createContextPanelView((action: PanelAction) => {
    if (action.command === 'UI:explore' || action.command === 'UI:establish') {
      // Expansion hand-off (REF-12.1, GDD-16): opening the routes window
      // prefilled; the order itself is a command the routes view issues.
      const locationId = Number(action.payload['location_id']);
      windowHost.open('routes');
      view.windows.set(windowHost.openKinds());
      logistics.prefill(
        action.command === 'UI:explore' ? exploreDraft(locationId) : establishDraft(locationId),
      );
      refreshWindows();
      return;
    }
    client.command({
      command_id: `client-panel-${action.id}-${Date.now()}`,
      actor_id: ACTOR_ID,
      type: action.command,
      payload: action.payload as never,
    });
  });

  const buildMenuView = createBuildMenuView(formatter, (definitionId) =>
    startPlacement(definitionId),
  );
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
    onEntityClick: (entityId) => {
      if (view.mode() === 'demolish') demolishEntity(entityId);
      else select(entityId);
    },
    onPathBegin: (position) => {
      dragStart = position;
    },
    onPathEnd: (position) => submitPath(position),
  });
  const selectedLocation = (): number | null => view.location();
  const layoutNow = (): ReturnType<typeof worldLayout> => {
    const projection = mirror.projection();
    const locations = projection?.locations ?? [];
    const connections = locations.flatMap((location) => location.connection_details ?? []);
    return worldLayout(locations, connections);
  };
  const canvas = createWorldCanvas({
    layout: layoutNow,
    camera: () => view.camera(),
    selected: selectedLocation,
    onSelectIsland: (locationId) => {
      panelTarget = 'location';
      view.location.set(locationId);
      const projection = mirror.projection();
      const location = projection?.locations.find((entry) => entry.entity_id === locationId);
      if (location !== undefined && location.knowledge !== 'unknown') {
        select(locationId);
      }
      refreshHud();
      canvas.invalidate();
      minimapView.update();
    },
  });
  const gridOverlay = h('div', {
    class: 'canvas-grid-overlay',
    'data-testid': 'canvas-grid-overlay',
  });
  const islandActions = h('div', { class: 'island-actions', 'data-testid': 'island-actions' });
  const renderIslandActions = (): void => {
    const projection = mirror.projection();
    const locationId = selectedLocation();
    const location =
      locationId === null
        ? undefined
        : projection?.locations.find((entry) => entry.entity_id === locationId);
    if (location === undefined) {
      islandActions.replaceChildren();
      islandActions.hidden = true;
      return;
    }
    islandActions.hidden = false;
    const button = (testId: string, text: string, onclick: () => void): HTMLElement =>
      h('button', { 'data-testid': testId, text, onclick });
    islandActions.replaceChildren();
    if (location.knowledge !== 'unknown') {
      islandActions.append(
        button('map-activate', location.active ? 'Deactivate' : 'Activate', () => {
          client.command({
            command_id: `client-location-${Date.now()}`,
            actor_id: ACTOR_ID,
            type: location.active ? 'DeactivateLocation' : 'ActivateLocation',
            payload: { location_id: location.entity_id },
          });
        }),
        button('map-explore', 'Explore', () => {
          windowHost.open('logistics');
          view.windows.set(windowHost.openKinds());
          logistics.prefill(exploreDraft(location.entity_id));
          refreshWindows();
        }),
        button('map-establish', 'Establish', () => {
          windowHost.open('logistics');
          view.windows.set(windowHost.openKinds());
          logistics.prefill(establishDraft(location.entity_id));
          refreshWindows();
        }),
      );
    }
  };
  const minimapView = createMinimap({
    layout: layoutNow,
    camera: () => view.camera(),
    viewport: () => canvas.viewport(),
    population: () => {
      const locationId = selectedLocation();
      const summary = locationId === null ? undefined : summaries.get(locationId);
      if (summary?.population_by_tier !== undefined) return summary.population_by_tier;
      const totals: Record<string, number> = {};
      for (const entry of summaries.values()) {
        for (const [tier, count] of Object.entries(entry.population_by_tier ?? {})) {
          totals[tier] = (totals[tier] ?? 0) + count;
        }
      }
      return totals;
    },
    onMove: (camera) => {
      view.camera.set(clampCamera(camera, layoutNow().bounds, canvas.viewport()));
      canvas.invalidate();
      minimapView.update();
    },
  });
  let currentDetail: EntityDetailDto | null = null;
  let currentBreakdown: readonly NeedBreakdownDto[] = [];
  const summaries = new Map<number, LocationSummaryDto>();

  const select = (entity: number): void => {
    panelTarget = 'entity';
    view.selection.set(entity);
    client.query(ACTOR_ID, { kind: 'entity_detail', entity_id: entity });
    client.query(ACTOR_ID, { kind: 'need_breakdown', entity_id: entity });
  };

  const entityList = h('div', { class: 'entity-list', 'data-testid': 'entity-list' });
  const locationList = h('div', { class: 'location-list', 'data-testid': 'location-list' });

  /**
   * Positions the HTML grid renderer over the viewed island: the existing grid
   * view is reused unchanged instead of re-implemented in SVG, and hidden at
   * world zoom (REF-12.1).
   */
  const placeGridOverlay = (): void => {
    const level = zoomLevel(view.camera().zoom);
    const locationId = view.location();
    const screen = locationId === null ? null : canvas.islandScreen(locationId);
    if (level === 'world' || screen === null) {
      gridOverlay.hidden = true;
      return;
    }
    gridOverlay.hidden = false;
    gridOverlay.setAttribute(
      'style',
      `left:${screen.x}px;top:${screen.y}px;width:${screen.size}px;height:${screen.size}px;`,
    );
  };

  const refreshView = (): void => {
    placeGridOverlay();
    canvas.invalidate();
    minimapView.update();
  };

  /** Camera gestures (REF-13.5): wheel zoom on the cursor, drag to pan. */
  const bindCamera = (): void => {
    canvas.el.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const bounds = canvas.el.getBoundingClientRect();
        const anchor = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
        view.camera.set(
          clampCamera(
            zoomAround(view.camera(), event.deltaY < 0 ? 1.2 : 1 / 1.2, anchor, canvas.viewport()),
            layoutNow().bounds,
            canvas.viewport(),
          ),
        );
        refreshHud();
      },
      { passive: false },
    );
    let dragging: { readonly x: number; readonly y: number } | null = null;
    canvas.el.addEventListener('pointerdown', (event) => {
      dragging = { x: event.clientX, y: event.clientY };
      canvas.el.setPointerCapture?.(event.pointerId);
    });
    canvas.el.addEventListener('pointermove', (event) => {
      if (dragging === null) return;
      const delta = { x: event.clientX - dragging.x, y: event.clientY - dragging.y };
      dragging = { x: event.clientX, y: event.clientY };
      view.camera.set(
        clampCamera(panBy(view.camera(), delta), layoutNow().bounds, canvas.viewport()),
      );
      refreshHud();
    });
    canvas.el.addEventListener('pointerup', () => {
      dragging = null;
    });
  };

  /** Renders the tier-tabbed build menu from the current metadata and stock. */
  const showBuildMenu = (selectedId: string | null): void => {
    const locationId = view.location();
    const summary = locationId === null ? undefined : summaries.get(locationId);
    buildMenuView.show(buildMenu(definitions, i18n, summary?.inventory_totals ?? {}), selectedId);
  };

  /** The EP cost of establishing a location, from definition metadata (GDD-16.3). */
  const establishmentCost = (): number | null => {
    for (const definition of definitions) {
      const parameters = definition.parameters['parameters'];
      if (parameters === null || typeof parameters !== 'object' || Array.isArray(parameters)) {
        continue;
      }
      const costs = (parameters as Record<string, unknown>)['costs'];
      if (!Array.isArray(costs)) continue;
      for (const cost of costs) {
        if (cost === null || typeof cost !== 'object' || Array.isArray(cost)) continue;
        const record = cost as Record<string, unknown>;
        if (record['resource'] !== 'ref.tier.resource.ep') continue;
        const quantity = record['quantity'];
        if (typeof quantity === 'number') return quantity;
      }
    }
    return null;
  };

  /** Chooses and renders the context panel (REF-12.3). */
  const refreshContext = (): void => {
    const locationId = view.location();
    const summary = locationId === null ? null : (summaries.get(locationId) ?? null);
    const location =
      locationId === null
        ? null
        : ((mirror.projection()?.locations ?? []).find((entry) => entry.entity_id === locationId) ??
          null);
    const archetype = (definitionId: string): string | null => archetypes.get(definitionId) ?? null;
    const panel =
      panelTarget === 'build'
        ? null
        : contextPanel({
            selection: panelTarget === 'entity' ? view.selection() : null,
            detail: currentDetail,
            needs: currentBreakdown,
            summary,
            location: panelTarget === 'location' ? location : null,
            establishmentCost: establishmentCost(),
            transport: transportDetail,
            projection: mirror.projection(),
            formatter,
            archetypeOf: archetype,
            ownerId: ACTOR_ID,
          });
    contextView.show(panel);
    const build = panel === null && panelTarget === 'build';
    buildMenuView.el.hidden = !build;
    islandActions.hidden = panelTarget !== 'location' || location === null;
    if (build) showBuildMenu(view.placement().definitionId);
  };

  /**
   * Demolish (REF-13.1): a planned entity is cancelled, an existing one is
   * deconstructed. The lifecycle decides which command is correct.
   */
  const demolishEntity = (entityId: number): void => {
    const entity = mirror.projection()?.entities.find((entry) => entry.entity_id === entityId);
    const lifecycle = entity?.lifecycle ?? 'active';
    const type =
      lifecycle === 'planned' || lifecycle === 'awaiting_resources'
        ? 'CancelEntityPlan'
        : 'DeconstructEntity';
    client.command({
      command_id: `client-demolish-${Date.now()}`,
      actor_id: ACTOR_ID,
      type,
      payload: { entity_id: entityId },
    });
  };

  /**
   * Connector drag (REF-13.3 step 4): the path is computed as an axis-aligned L
   * and one `PlaceEntityPlan` is submitted per cell in path order. Placement
   * validity stays authoritative: a cell the host rejects produces no entity
   * and is reported as a rejection (04 §14).
   */
  let dragStart: readonly [number, number] | null = null;
  const submitPath = (end: readonly [number, number]): void => {
    const location = currentLocation();
    const start = dragStart;
    dragStart = null;
    if (location === undefined || start === null) return;
    const cells = dragPath({ x: start[0], y: start[1] }, { x: end[0], y: end[1] });
    if (cells.length <= 1) return;
    const definitionId = view.placement().definitionId;
    if (definitionId === null) return;
    for (const cell of cells) {
      client.command({
        command_id: `client-place-${Date.now()}-${cell.x}-${cell.y}`,
        actor_id: ACTOR_ID,
        type: 'PlaceEntityPlan',
        payload: {
          definition_id: definitionId,
          location_id: location.entity_id,
          logical_transform: {
            position: [cell.x, cell.y],
            orientation: view.placement().orientation,
          },
        },
      });
    }
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
    renderIslandActions();
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
          refreshContext();
        }
        if (result.need_breakdown !== undefined) {
          currentBreakdown = result.need_breakdown;
          refreshContext();
        }
        if (result.location_summary !== undefined && result.location_summary !== null) {
          summaries.set(result.location_summary.entity_id, result.location_summary);
          population.show([...summaries.values()]);
          refreshContext();
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
            showBuildMenu(view.placement().definitionId);
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
          transportDetail = result.transport_detail;
          refreshContext();
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
  frame.regions.minimap.append(minimapView.el);
  mountNewsPlaceholder(frame.regions.news);
  frame.regions.resourceBar.append(resourceBarView.el);
  frame.regions.banner.append(bannerView.el);
  frame.regions.actionBar.append(actionBar.el);

  // The context panel shows the build menu when nothing is selected and the
  // island actions for a selected island (REF-12.3; 11.4d replaces this with
  // the full panel set).
  frame.regions.contextPanel.append(
    islandActions,
    contextView.el,
    buildMenuView.el,
    h('div', { class: 'hud-lists' }, entityList, locationList),
  );
  gridOverlay.append(grid.el);
  frame.world.append(canvas.el, gridOverlay, windowHost.el);
  view.camera.set(
    homeCamera(
      layoutNow(),
      (mirror.projection()?.locations ?? [])
        .filter((location) => location.knowledge === 'established')
        .map((location) => location.entity_id),
      view.camera().zoom,
    ),
  );

  const statisticsView_ = createStatisticsView(economy.el);
  const logView_ = createLogView((entity) => select(entity));
  for (const window of [
    { kind: 'statistics', title: 'Statistics', el: statisticsView_.el },
    { kind: 'planning', title: i18n.t('planning.title'), el: planning.el },
    { kind: 'routes', title: 'Routes', el: logistics.el },
    { kind: 'exchange', title: i18n.t('exchange.title'), el: exchange.el },
    { kind: 'log', title: 'Log', el: logView_.el },
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
    placeGridOverlay();
    canvas.invalidate();
    minimapView.update();
  };
  mirror.projection.subscribe(refreshHud);
  view.location.subscribe(() => {
    refreshHud();
    persist();
  });
  view.pins.subscribe(refreshHud);
  view.selection.subscribe(() => {
    renderIslandActions();
    refreshContext();
  });
  refreshHud();
  refreshView();
  bindCamera();
  refreshWindows();

  root.append(frame.el, debug.el);

  document.addEventListener('keydown', (event) => {
    if (event.key === '`') view.debug.set(!view.debug());
    if (event.key === 'Home') {
      view.camera.set(
        homeCamera(
          layoutNow(),
          (mirror.projection()?.locations ?? [])
            .filter((location) => location.knowledge === 'established')
            .map((location) => location.entity_id),
          LOCATION_ZOOM,
        ),
      );
      refreshHud();
      return;
    }
    if (event.key === '+' || event.key === '=') {
      view.camera.set(
        zoomAround(
          view.camera(),
          DETAIL_ZOOM > view.camera().zoom ? 1.25 : 1,
          { x: canvas.viewport().width / 2, y: canvas.viewport().height / 2 },
          canvas.viewport(),
        ),
      );
      refreshHud();
      return;
    }
    if (event.key === '-' || event.key === '_') {
      view.camera.set(
        zoomAround(
          view.camera(),
          1 / 1.25,
          { x: canvas.viewport().width / 2, y: canvas.viewport().height / 2 },
          canvas.viewport(),
        ),
      );
      refreshHud();
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
    if (event.key === 'b' || event.key === 'B' || event.key === 'x' || event.key === 'X') {
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
    if (
      event.key === 'e' ||
      event.key === 'E' ||
      event.key === 'p' ||
      event.key === 'P' ||
      event.key === 'l' ||
      event.key === 'L' ||
      event.key === 'y' ||
      event.key === 'Y' ||
      event.key === 'g' ||
      event.key === 'G' ||
      event.key === 't' ||
      event.key === 'T'
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
