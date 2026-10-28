/**
 * The context-panel selector (REF-12.3). One panel at a time: the build menu
 * when nothing is selected, otherwise a residence, producer, hub, transport
 * unit, or location panel derived from the read models. The selector is pure;
 * the view renders it and submits commands through the session client.
 *
 * Source: REF-12.3, PIC-9.3, PIC-10.1, PIC-10.2, PIC-10.3, PIC-10.4
 */
import type {
  EntityDetailDto,
  InventoryDto,
  LocationDto,
  LocationSummaryDto,
  NeedBreakdownDto,
  SnapshotDto,
  TransportDetailDto,
} from '@aesfw/protocol';

import type { Formatter } from '../format/index.js';

/** The panel kinds of REF-12.3. */
export type ContextPanelKind =
  'build' | 'residence' | 'producer' | 'hub' | 'transport' | 'location';

/** A labelled row of a panel. */
export interface PanelRow {
  readonly label: string;
  readonly value: string;
  /** True when the row is a warning (accent), e.g. a block reason. */
  readonly attention?: boolean;
}

/** A section of a panel. */
export interface PanelSection {
  readonly title: string;
  readonly rows: readonly PanelRow[];
}

/** A bar of a panel (need fulfillment, progress). */
export interface PanelBar {
  readonly label: string;
  /** 0..1000. */
  readonly permille: number;
  readonly detail: string;
}

/** A command button of a panel. */
export interface PanelAction {
  readonly id: string;
  readonly label: string;
  readonly command: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly disabled?: boolean;
}

/** The context panel model (REF-12.3). */
export interface ContextPanel {
  readonly kind: ContextPanelKind;
  readonly title: string;
  readonly sections: readonly PanelSection[];
  readonly bars: readonly PanelBar[];
  readonly actions: readonly PanelAction[];
}

/** The inputs the panel selector needs. */
export interface ContextPanelInput {
  readonly selection: number | null;
  readonly detail: EntityDetailDto | null;
  readonly needs: readonly NeedBreakdownDto[];
  readonly summary: LocationSummaryDto | null;
  readonly location: LocationDto | null;
  readonly transport: TransportDetailDto | null;
  readonly projection: SnapshotDto | null;
  readonly formatter: Formatter;
  readonly archetypeOf: (definitionId: string) => string | null;
  readonly ownerId: string;
}

const percent = (permille: number): string => `${Math.round(permille / 10)}%`;

/** Residence panel: need bars, Z and band, advancement checklist, locks. */
const residencePanel = (input: ContextPanelInput, detail: EntityDetailDto): ContextPanel => {
  const formatter = input.formatter;
  const residence = detail.residence;
  const bars: PanelBar[] = input.needs
    .filter((need) => need.demand > 0)
    .map((need) => ({
      label: need.need_id.split('.').at(-1)?.toUpperCase() ?? need.need_id,
      permille: need.fulfillment,
      detail: `${need.delivered} / ${need.demand} · ${percent(need.fulfillment)}`,
    }));
  const sections: PanelSection[] = [
    {
      title: 'Population',
      rows: [
        {
          label: 'Satisfaction',
          value:
            residence === undefined
              ? '—'
              : `${percent(residence.satisfaction)} (${residence.band})`,
        },
        {
          label: 'Inhabitants',
          value: residence === undefined ? '—' : String(residence.population),
        },
      ],
    },
  ];
  const eligibility = residence?.transition_eligibility ?? [];
  if (eligibility.length > 0) {
    sections.push({
      title: 'Advancement',
      rows: eligibility.flatMap((entry) => [
        {
          label: `Transition ${entry.transition_id.split('.').at(-1) ?? ''}`,
          value: entry.eligible ? 'eligible' : 'ineligible',
        },
        ...entry.conditions.map((condition) => ({
          label: condition.condition_id.split('.').at(-1) ?? condition.condition_id,
          value:
            condition.kind === 'sustained'
              ? `${condition.met ? 'met' : 'waiting'} (${condition.progress ?? 0}/${condition.ticks ?? 0})`
              : condition.met
                ? 'met'
                : 'not met',
          ...(condition.met ? {} : { attention: true }),
        })),
      ]),
    });
  }
  const actions: PanelAction[] =
    eligibility.length > 0
      ? [
          {
            id: 'advance',
            label: 'Advance',
            command: 'RequestPopulationTransition',
            payload: { entity_id: detail.entity_id, transition_id: eligibility[0]?.transition_id },
            disabled: eligibility[0]?.eligible !== true,
          },
        ]
      : [];
  sections.push({
    title: 'Maintenance',
    rows: [
      {
        label: 'Credits',
        value: detail.maintenance === undefined ? '—' : formatter.format(detail.maintenance.amount),
      },
      { label: 'Charged', value: detail.maintenance?.policy ?? '—' },
    ],
  });
  return {
    kind: 'residence',
    title: detail.definition_id.split('.').at(-1)?.toUpperCase() ?? detail.definition_id,
    sections,
    bars,
    actions,
  };
};

/** Producer or service panel: rates, capability, maintenance, pause state. */
const producerPanel = (input: ContextPanelInput, detail: EntityDetailDto): ContextPanel => {
  const formatter = input.formatter;
  const production = detail.production;
  const rows: PanelRow[] = [
    { label: 'Definition', value: detail.definition_id },
    { label: 'Lifecycle', value: detail.lifecycle },
    { label: 'Enabled', value: detail.enabled ? 'yes' : 'no' },
  ];
  if (detail.paused_by_deficit === true) {
    rows.push({ label: 'Deficit', value: 'paused', attention: true });
  }
  if (production?.recipe_id !== undefined) {
    rows.push({ label: 'Recipe', value: production.recipe_id });
    rows.push({
      label: 'Progress',
      value: `${Math.round((production.progress * 1000) / Math.max(1, production.progress_scale)) / 10}%`,
    });
  }
  for (const reason of detail.block_reasons) {
    rows.push({ label: 'Blocked', value: reason, attention: true });
  }
  const actions: PanelAction[] = [
    {
      id: 'toggle',
      label: detail.enabled ? 'Disable' : 'Enable',
      command: 'SetEntityEnabled',
      payload: { entity_id: detail.entity_id, enabled: !detail.enabled },
    },
  ];
  return {
    kind: 'producer',
    title: detail.definition_id.split('.').at(-1)?.toUpperCase() ?? detail.definition_id,
    sections: [
      { title: 'State', rows },
      {
        title: 'Maintenance',
        rows: [
          {
            label: 'Credits',
            value:
              detail.maintenance === undefined ? '—' : formatter.format(detail.maintenance.amount),
          },
          { label: 'Charged', value: detail.maintenance?.policy ?? '—' },
        ],
      },
    ],
    bars: [],
    actions,
  };
};

/** The inventory rows of a hub, with stored and capacity per resource. */
export const hubInventoryRows = (
  inventories: readonly InventoryDto[],
  formatter: Formatter,
): readonly PanelRow[] =>
  inventories.flatMap((inventory) =>
    inventory.entries.map((entry) => ({
      label: entry.resource_id.split('.').at(-1)?.toUpperCase() ?? entry.resource_id,
      value: `${formatter.format(entry.stored)} (${formatter.format(entry.reserved)} reserved)`,
    })),
  );

/** Hub panel: the location's inventory and throughput. */
const hubPanel = (input: ContextPanelInput): ContextPanel => {
  const summary = input.summary;
  const rows = hubInventoryRows(
    (input.detail?.inventories ?? []).map((inventory) => inventory),
    input.formatter,
  );
  const throughput = summary?.throughput;
  return {
    kind: 'hub',
    title: input.location?.definition_id?.split('.').at(-1)?.toUpperCase() ?? 'Hub',
    sections: [
      {
        title: 'Inventory',
        rows:
          rows.length === 0
            ? Object.entries(summary?.inventory_totals ?? {})
                .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
                .map(([resource, quantity]) => ({
                  label: resource.split('.').at(-1)?.toUpperCase() ?? resource,
                  value: input.formatter.format(quantity),
                }))
            : rows,
      },
      {
        title: 'Throughput',
        rows:
          throughput === undefined
            ? []
            : [
                { label: 'Capacity', value: String(throughput.capacity) },
                { label: 'Requested', value: String(throughput.requested) },
                { label: 'Throttle', value: percent(throughput.throttle_permille) },
              ],
      },
    ],
    bars: [],
    actions: [],
  };
};

/** Transport unit panel: order, stations, cargo, and assignment. */
const transportPanel = (input: ContextPanelInput, detail: EntityDetailDto): ContextPanel => {
  const transport = input.transport;
  const cargo = transport?.cargo?.slots ?? [];
  const rows: PanelRow[] =
    transport === null
      ? [{ label: 'Unit', value: detail.definition_id }]
      : [
          { label: 'Unit', value: detail.definition_id },
          { label: 'State', value: transport.state },
          {
            label: 'Order',
            value: transport.order_id === undefined ? '—' : String(transport.order_id),
          },
          ...(transport.current_station === undefined
            ? []
            : [{ label: 'Station', value: String(transport.current_station) }]),
          ...(transport.failure_reasons ?? []).map((reason) => ({
            label: 'Failure',
            value: reason,
            attention: true,
          })),
          ...cargo.map((entry, index) => ({
            label: `Slot ${index + 1}`,
            value:
              entry.resource_id === undefined
                ? 'empty'
                : `${entry.resource_id.split('.').at(-1)?.toUpperCase() ?? entry.resource_id} ${entry.quantity}`,
          })),
        ];
  const actions: PanelAction[] =
    transport?.order_id === undefined
      ? []
      : [
          {
            id: 'unassign',
            label: 'Unassign',
            command: 'UnassignTransport',
            payload: { unit_id: detail.entity_id },
          },
        ];
  return {
    kind: 'transport',
    title: 'Transport',
    sections: [{ title: 'Unit', rows }],
    bars: [],
    actions,
  };
};

/** The location panel (REF-12.3): knowledge gating and activation commands. */
export const locationPanel = (
  location: LocationDto | null,
  summary: LocationSummaryDto | null,
): ContextPanel | null => {
  if (location === null) return null;
  const known = location.knowledge !== 'unknown';
  const rows: PanelRow[] = [
    { label: 'Location', value: location.definition_id ?? String(location.entity_id) },
    { label: 'Knowledge', value: location.knowledge ?? 'unknown' },
  ];
  if (known) {
    rows.push(
      { label: 'Region', value: location.properties?.region ?? '—' },
      { label: 'Owner', value: location.owner_id ?? 'unowned' },
      { label: 'Active', value: location.active === true ? 'yes' : 'no' },
      ...Object.entries(location.properties?.values ?? {}).map(([property, value]) => ({
        label: property.split('.').at(-1) ?? property,
        value: String(value),
      })),
      ...(summary?.population_by_tier === undefined
        ? []
        : Object.entries(summary.population_by_tier).map(([tier, count]) => ({
            label: `Population ${tier.split('.').at(-1) ?? tier}`,
            value: String(count),
          }))),
    );
  }
  return {
    kind: 'location',
    title: location.definition_id?.split('.').at(-1)?.toUpperCase() ?? 'Location',
    sections: [{ title: 'Location', rows }],
    bars: [],
    actions: known
      ? [
          {
            id: 'activate',
            label: location.active === true ? 'Deactivate' : 'Activate',
            command: location.active === true ? 'DeactivateLocation' : 'ActivateLocation',
            payload: { location_id: location.entity_id },
          },
        ]
      : [],
  };
};

/**
 * Chooses and builds the context panel (REF-12.3). The build menu is the
 * fallback when nothing is selected; an unknown location shows only its
 * knowledge state (PIC-9.3).
 *
 * Source: REF-12.3, PIC-9.3
 */
export function contextPanel(input: ContextPanelInput): ContextPanel | null {
  const detail = input.detail;
  if (detail !== null && input.selection !== null) {
    if (detail.residence !== undefined) return residencePanel(input, detail);
    const archetype = input.archetypeOf(detail.definition_id);
    if (archetype === 'unit') return transportPanel(input, detail);
    if (detail.inventories !== undefined && detail.inventories.length > 0) return hubPanel(input);
    if (detail.production !== undefined || detail.available_commands.includes('SetEntityEnabled')) {
      return producerPanel(input, detail);
    }
  }
  if (input.location !== null) return locationPanel(input.location, input.summary);
  return null;
}

/** True when the build menu should render (nothing is selected, REF-12.3). */
export const showsBuildMenu = (selection: number | null, panel: ContextPanel | null): boolean =>
  selection === null && panel === null;
