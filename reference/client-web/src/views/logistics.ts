/**
 * Logistics drawer and route editor (REF-12.4). The view renders the pure
 * logistics model and turns edits into command callbacks; it never computes
 * mechanics and never mutates the mirror.
 *
 * Source: REF-12.4, PIC-16
 */
import { h, replaceChildren } from '../dom/h.js';
import { draftFromOrder } from '../selectors/index.js';
import type {
  LogisticsViewModel,
  RouteActionDraft,
  RouteDraft,
  RouteStationDraft,
} from '../selectors/index.js';

/** Callbacks the logistics view invokes. */
export interface LogisticsDeps {
  readonly onCreate: (draft: RouteDraft) => void;
  readonly onModify: (orderId: number, draft: RouteDraft) => void;
  readonly onDelete: (orderId: number) => void;
  readonly onAssign: (unitId: number, orderId: number) => void;
  readonly onUnassign: (unitId: number) => void;
  readonly onSelectUnit: (unitId: number) => void;
}

/** A mounted logistics view. */
export interface LogisticsView {
  readonly el: HTMLElement;
  show(model: LogisticsViewModel): void;
}

const RULES = [
  'fixed',
  'up_to_capacity',
  'all',
  'excess_above',
  'deficit_below',
  'maintain_origin_minimum',
  'maintain_destination_target',
  'priority_list',
] as const;

const ACTIONS = ['load', 'unload', 'buy', 'sell'] as const;

const inputValue = (event: Event): string => (event.target as HTMLInputElement).value;

/**
 * Creates the logistics view (REF-12.4).
 *
 * Source: REF-12.4
 */
export function createLogisticsView(deps: LogisticsDeps): LogisticsView {
  const el = h('section', { class: 'logistics', 'data-testid': 'logistics' });
  let model: LogisticsViewModel | null = null;
  let selectedUnit: number | null = null;
  let selectedOrder: number | null = null;
  let draft: RouteDraft | null = null;

  const setDraft = (next: RouteDraft | null): void => {
    draft = next;
    render();
  };

  const editDraft = (change: (current: RouteDraft) => RouteDraft): void => {
    if (draft === null) return;
    setDraft(change(draft));
  };

  const editStation = (index: number, patch: Partial<RouteStationDraft>): void => {
    editDraft((current) => ({
      ...current,
      stations: current.stations.map((station, stationIndex) =>
        stationIndex === index ? { ...station, ...patch } : station,
      ),
    }));
  };

  const editAction = (
    stationIndex: number,
    actionIndex: number,
    patch: Partial<RouteActionDraft>,
  ): void => {
    editDraft((current) => ({
      ...current,
      stations: current.stations.map((station, index) =>
        index === stationIndex
          ? {
              ...station,
              actions: station.actions.map((action, currentActionIndex) =>
                currentActionIndex === actionIndex ? { ...action, ...patch } : action,
              ),
            }
          : station,
      ),
    }));
  };

  const render = (): void => {
    if (model === null) return;
    const unitNodes = model.units.map((unit) =>
      h(
        'button',
        {
          class: `logistics-unit${selectedUnit === unit.entityId ? ' selected' : ''}`,
          'data-testid': `logistics-unit-${unit.entityId}`,
          text: `${unit.entityId} ${unit.state}`,
          onclick: () => {
            selectedUnit = unit.entityId;
            deps.onSelectUnit(unit.entityId);
            render();
          },
        },
        ...[],
      ),
    );
    const orderNodes = model.orders.map((order) =>
      h(
        'button',
        {
          class: `logistics-order${selectedOrder === order.orderId ? ' selected' : ''}`,
          'data-testid': `logistics-order-${order.orderId}`,
          text: `${order.orderId} ${order.mode} (${order.stationCount})`,
          onclick: () => {
            selectedOrder = order.orderId;
            const source = model?.orderDetails.find((entry) => entry.order_id === order.orderId);
            setDraft(source === undefined ? null : draftFromOrder(source));
          },
        },
        ...[],
      ),
    );
    const detail = model.detail;
    const detailRows: HTMLElement[] = [];
    if (detail !== null) {
      detailRows.push(
        h('div', { class: 'logistics-detail-row', text: `state: ${detail.state}` }),
        h('div', {
          class: 'logistics-detail-row',
          text: `station: ${detail.current_station ?? '-'}`,
        }),
        h('div', {
          class: 'logistics-detail-row',
          text: `cargo: ${(detail.cargo?.slots ?? [])
            .map((slot) => `${slot.resource_id ?? 'empty'}=${slot.quantity}`)
            .join(', ')}`,
        }),
        h('div', {
          class: 'logistics-detail-row',
          text: `progress: ${detail.progress?.handled ?? 0}/${detail.progress?.target ?? 0}`,
        }),
      );
      for (const reason of detail.failure_reasons ?? []) {
        detailRows.push(h('div', { class: 'logistics-detail-row failure', text: reason }));
      }
    }
    const editorNodes: HTMLElement[] = [];
    if (draft !== null) {
      editorNodes.push(
        h('h4', { class: 'logistics-editor-title', text: 'Route' }),
        h(
          'label',
          { class: 'logistics-field' },
          h('span', { text: 'repeat' }),
          h('input', {
            type: 'checkbox',
            checked: draft.repeat,
            onchange: (event: Event) =>
              editDraft((current) => ({
                ...current,
                repeat: (event.target as HTMLInputElement).checked,
              })),
          }),
        ),
      );
      draft.stations.forEach((station, stationIndex) => {
        const actionNodes = station.actions.map((action, actionIndex) =>
          h(
            'div',
            {
              class: 'logistics-action',
              'data-testid': `logistics-action-${stationIndex}-${actionIndex}`,
            },
            h('input', {
              type: 'text',
              value: action.resourceId,
              placeholder: 'resource id',
              onchange: (event: Event) =>
                editAction(stationIndex, actionIndex, { resourceId: inputValue(event) }),
            }),
            h(
              'select',
              {
                onchange: (event: Event) =>
                  editAction(stationIndex, actionIndex, { action: inputValue(event) }),
              },
              ...ACTIONS.map((actionName) =>
                h('option', {
                  value: actionName,
                  selected: action.action === actionName,
                  text: actionName,
                }),
              ),
            ),
            h(
              'select',
              {
                onchange: (event: Event) =>
                  editAction(stationIndex, actionIndex, { ruleMode: inputValue(event) }),
              },
              ...RULES.map((rule) =>
                h('option', {
                  value: rule,
                  selected: action.ruleMode === rule,
                  text: rule,
                }),
              ),
            ),
            h('input', {
              type: 'number',
              value: action.quantity ?? 0,
              onchange: (event: Event) =>
                editAction(stationIndex, actionIndex, {
                  quantity: Number(inputValue(event)),
                }),
            }),
            h('input', {
              type: 'number',
              value: action.priceLimit ?? 0,
              onchange: (event: Event) =>
                editAction(stationIndex, actionIndex, {
                  priceLimit: Number(inputValue(event)),
                }),
            }),
            h('button', {
              text: 'x',
              onclick: () =>
                editStation(stationIndex, {
                  actions: station.actions.filter((_, index) => index !== actionIndex),
                }),
            }),
          ),
        );
        editorNodes.push(
          h(
            'div',
            { class: 'logistics-station', 'data-testid': `logistics-station-${stationIndex}` },
            h('label', {
              class: 'logistics-field',
              text: 'endpoint',
            }),
            h('input', {
              type: 'number',
              value: station.endpointId,
              onchange: (event: Event) =>
                editStation(stationIndex, { endpointId: Number(inputValue(event)) }),
            }),
            ...actionNodes,
            h('button', {
              text: '+ action',
              onclick: () =>
                editStation(stationIndex, {
                  actions: [
                    ...station.actions,
                    {
                      resourceId: station.actions[0]?.resourceId ?? '',
                      action: 'load',
                      ruleMode: 'all',
                    },
                  ],
                }),
            }),
            h('button', {
              text: 'remove station',
              onclick: () =>
                editDraft((current) => ({
                  ...current,
                  stations: current.stations.filter((_, index) => index !== stationIndex),
                })),
            }),
          ),
        );
      });
      const firstLocation = model.locations[0]?.entity_id ?? 0;
      const lastStation = draft.stations[draft.stations.length - 1];
      editorNodes.push(
        h('button', {
          text: '+ station',
          onclick: () =>
            editDraft((current) => ({
              ...current,
              stations: [
                ...current.stations,
                {
                  endpointId: lastStation?.endpointId ?? firstLocation,
                  actions: [
                    {
                      resourceId: lastStation?.actions[0]?.resourceId ?? '',
                      action: 'unload',
                      ruleMode: 'all',
                    },
                  ],
                },
              ],
            })),
        }),
        h('button', {
          class: 'logistics-save',
          text: 'save',
          onclick: () => {
            if (draft === null) return;
            if (draft.orderId === undefined) deps.onCreate(draft);
            else deps.onModify(draft.orderId, draft);
          },
        }),
      );
    }
    const controls: HTMLElement[] = [
      h('button', {
        text: 'new route',
        onclick: () => {
          const first = model?.locations[0]?.entity_id ?? 0;
          const second = model?.locations[1]?.entity_id ?? first;
          const resourceId = model?.orderDetails[0]?.stations[0]?.actions[0]?.resource_id ?? '';
          setDraft(emptyDraftFor(first, second, resourceId));
        },
      }),
    ];
    if (selectedUnit !== null && selectedOrder !== null) {
      controls.push(
        h('button', {
          text: 'assign',
          onclick: () => deps.onAssign(selectedUnit as number, selectedOrder as number),
        }),
      );
    }
    if (selectedUnit !== null) {
      controls.push(
        h('button', {
          text: 'unassign',
          onclick: () => deps.onUnassign(selectedUnit as number),
        }),
      );
    }
    if (selectedOrder !== null) {
      controls.push(
        h('button', {
          text: 'delete order',
          onclick: () => deps.onDelete(selectedOrder as number),
        }),
      );
    }
    replaceChildren(
      el,
      h('h3', { text: 'Logistics' }),
      h('h4', { text: 'Units' }),
      h('div', { class: 'logistics-list' }, ...unitNodes),
      h('h4', { text: 'Orders' }),
      h('div', { class: 'logistics-list' }, ...orderNodes),
      h('div', { class: 'logistics-detail' }, ...detailRows),
      h('div', { class: 'logistics-controls' }, ...controls),
      h('div', { class: 'logistics-editor' }, ...editorNodes),
    );
  };

  const show = (next: LogisticsViewModel): void => {
    model = next;
    if (next.detail !== null && selectedUnit === null) selectedUnit = next.detail.entity_id;
    render();
  };

  return { el, show };
}

const emptyDraftFor = (origin: number, destination: number, resourceId: string): RouteDraft => ({
  mode: 'route',
  repeat: true,
  stations: [
    { endpointId: origin, actions: [{ resourceId, action: 'load', ruleMode: 'all' }] },
    { endpointId: destination, actions: [{ resourceId, action: 'unload', ruleMode: 'all' }] },
  ],
});
