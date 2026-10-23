/**
 * The entity inspector (REF-12.3). Renders an `EntityDetailDto` and its need
 * breakdown, and issues `SetEntityEnabled` and `SelectRecipe` through the
 * session client. It never mutates the mirror locally.
 *
 * Source: REF-12.3, REF-13.4
 */
import type { SessionClient } from '@aesfw/host-web/client';
import type { EntityDetailDto, JsonObject, NeedBreakdownDto } from '@aesfw/protocol';
import { h, replaceChildren } from '../dom/h.js';
import type { I18n } from '../i18n/index.js';
import { constructionCommands, entityInspector, needRows } from '../selectors/index.js';
import { residenceChecklist } from '../selectors/progression.js';

/** A mounted inspector. */
export interface Inspector {
  readonly el: HTMLElement;
  show(detail: EntityDetailDto | null, breakdown: readonly NeedBreakdownDto[]): void;
}

/**
 * Creates the inspector (REF-12.3).
 *
 * Source: REF-12.3
 */
export function createInspector(client: SessionClient, actorId: string, i18n: I18n): Inspector {
  const body = h('div', { class: 'inspector-body', 'data-testid': 'inspector' });

  const command = (type: string, payload: JsonObject): void => {
    client.command({
      command_id: `client-${type}-${Date.now()}`,
      actor_id: actorId,
      type,
      payload,
    });
  };

  const show = (detail: EntityDetailDto | null, breakdown: readonly NeedBreakdownDto[]): void => {
    if (detail === null) {
      replaceChildren(body, h('p', { text: 'no selection' }));
      return;
    }
    const vm = entityInspector(detail, i18n);
    const rows = vm.rows.map((row) =>
      h(
        'div',
        { class: 'row' },
        h('span', { class: 'label', text: row.label }),
        h('span', { class: 'value', text: row.value }),
      ),
    );
    const toggle = h('button', {
      'data-testid': 'inspector-toggle-enabled',
      text: detail.enabled ? 'disable' : 'enable',
      onclick: () =>
        command('SetEntityEnabled', { entity_id: detail.entity_id, enabled: !detail.enabled }),
    });
    const construction = constructionCommands(detail.lifecycle).map((type) =>
      h('button', {
        class: 'inspector-command',
        'data-testid': `inspector-command-${type}`,
        text: i18n.t(type),
        onclick: () => command(type, { entity_id: detail.entity_id }),
      }),
    );
    const needs = needRows(breakdown, i18n).map((row) =>
      h(
        'div',
        { class: 'row need' },
        h('span', { class: 'label', text: row.need }),
        h('span', { class: 'value', text: `${row.delivered}/${row.demand}` }),
      ),
    );
    const transitions = residenceChecklist(detail).map((entry) =>
      h(
        'div',
        { class: 'row transition', 'data-testid': `inspector-transition-${entry.transition_id}` },
        h('span', { class: 'label', text: entry.transition_id }),
        h('span', {
          class: 'value',
          text: entry.eligible ? i18n.t('progression.eligible') : i18n.t('progression.ineligible'),
        }),
        h('button', {
          'data-testid': `inspector-advance-${entry.transition_id}`,
          text: i18n.t('progression.advance'),
          disabled: !entry.eligible,
          onclick: () =>
            command('RequestPopulationTransition', {
              entity_id: detail.entity_id,
              transition_id: entry.transition_id,
            }),
        }),
      ),
    );
    replaceChildren(
      body,
      h('h2', { text: vm.title }),
      ...rows,
      toggle,
      ...construction,
      ...needs,
      ...transitions,
    );
  };

  show(null, []);
  return { el: body, show };
}
