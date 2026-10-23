/**
 * The population/progression drawer (REF-12.4): the tier pyramid per location,
 * the selected residence's transition checklist, and purpose-lock toggles for
 * the selected location's resources. It issues commands through the session
 * client and renders only projection and read-model data.
 *
 * Source: REF-12.4, REF-12.3, PIC-10.1, PIC-10.2
 */
import type { SessionClient } from '@aesfw/host-web/client';
import type {
  EntityDetailDto,
  InventoryDto,
  JsonObject,
  LocationDto,
  LocationSummaryDto,
} from '@aesfw/protocol';
import { h, replaceChildren } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import { residenceChecklist, tierPyramid } from '../selectors/index.js';

/** A mounted progression drawer. */
export interface ProgressionView {
  readonly el: HTMLElement;
  show(
    locations: readonly LocationDto[],
    summaries: readonly LocationSummaryDto[],
    detail: EntityDetailDto | null,
    selectedLocation: number | null,
  ): void;
}

/**
 * Creates the progression drawer (REF-12.4).
 *
 * Source: REF-12.4
 */
export function createProgressionView(
  client: SessionClient,
  actorId: string,
  i18n: I18n,
): ProgressionView {
  const el = h('div', { class: 'progression', 'data-testid': 'progression-view' });

  const command = (type: string, payload: JsonObject): void => {
    client.command({
      command_id: `client-${type}-${Date.now()}`,
      actor_id: actorId,
      type,
      payload,
    });
  };

  const show = (
    locations: readonly LocationDto[],
    summaries: readonly LocationSummaryDto[],
    detail: EntityDetailDto | null,
    selectedLocation: number | null,
  ): void => {
    const pyramid = tierPyramid(summaries);
    const rows: HTMLElement[] = [];
    for (const location of pyramid.locations) {
      const max = Math.max(1, ...location.tiers.map((tier) => tier.population));
      rows.push(
        h(
          'div',
          { class: 'pyramid-location', 'data-testid': `pyramid-location-${location.locationId}` },
          h('h3', { text: `${i18n.t('progression.location')} ${location.locationId}` }),
          ...location.tiers.map((tier) =>
            h(
              'div',
              {
                class: 'pyramid-row',
                'data-testid': `pyramid-bar-${location.locationId}-${tier.tierId}`,
              },
              h('span', { class: 'label', text: tier.tierId }),
              h('span', {
                class: 'bar',
                style: `display:inline-block;width:${Math.round((80 * tier.population) / max)}px;background:#7aa`,
              }),
              h('span', { class: 'value', text: String(tier.population) }),
            ),
          ),
        ),
      );
    }

    const checklist = residenceChecklist(detail);
    const checklistNodes: HTMLElement[] = [];
    for (const entry of checklist) {
      checklistNodes.push(
        h(
          'div',
          { class: 'transition-entry', 'data-testid': `transition-${entry.transition_id}` },
          h('span', {
            class: 'label',
            text: `${entry.transition_id} ${entry.eligible ? i18n.t('progression.eligible') : i18n.t('progression.ineligible')}`,
          }),
          ...entry.conditions.map((condition) =>
            h('span', {
              class: 'condition',
              'data-testid': `condition-${entry.transition_id}-${condition.kind}`,
              text:
                condition.kind === 'sustained'
                  ? `${condition.condition_id} ${condition.progress ?? 0}/${condition.ticks ?? 0}`
                  : `${condition.condition_id} ${condition.met ? 'ok' : 'no'}`,
            }),
          ),
          h('button', {
            'data-testid': `advance-${entry.transition_id}`,
            text: i18n.t('progression.advance'),
            disabled: !entry.eligible || detail === null,
            onclick: () => {
              if (detail === null) return;
              command('RequestPopulationTransition', {
                entity_id: detail.entity_id,
                transition_id: entry.transition_id,
              });
            },
          }),
        ),
      );
    }

    const lockNodes: HTMLElement[] = [];
    const location = locations.find((entry) => entry.entity_id === selectedLocation);
    for (const inventory of location?.inventories ?? []) {
      for (const resource of resourceIdsOf(inventory)) {
        lockNodes.push(
          h(
            'div',
            { class: 'lock-row' },
            h('span', { class: 'label', text: `${inventory.inventory_id} ${resource}` }),
            h('button', {
              'data-testid': `lock-${inventory.inventory_id}-${resource}`,
              text: i18n.t('progression.lock'),
              onclick: () =>
                command('SetResourcePurposeLock', {
                  inventory_id: inventory.inventory_id,
                  resource,
                  purpose: 'population_transition',
                  locked: true,
                }),
            }),
            h('button', {
              'data-testid': `unlock-${inventory.inventory_id}-${resource}`,
              text: i18n.t('progression.unlock'),
              onclick: () =>
                command('SetResourcePurposeLock', {
                  inventory_id: inventory.inventory_id,
                  resource,
                  purpose: 'population_transition',
                  locked: false,
                }),
            }),
          ),
        );
      }
    }

    replaceChildren(
      el,
      h('h2', { text: i18n.t('progression.title') }),
      ...rows,
      h('h3', { text: i18n.t('progression.transitions') }),
      ...checklistNodes,
      h('h3', { text: i18n.t('progression.locks') }),
      ...lockNodes,
    );
  };

  show([], [], null, null);
  return { el, show };
}

/** The resource IDs of an inventory's entries (PIC-9.1). */
const resourceIdsOf = (inventory: InventoryDto): readonly string[] =>
  (inventory.entries ?? []).map((entry) => entry.resource_id);
