/**
 * The context panel view (REF-12.3): one panel at a time, rendered from the
 * pure `contextPanel` model. Commands are issued through the session client;
 * the view judges nothing.
 *
 * Source: REF-12.3
 */
import { h } from '../../dom/h.js';
import type { ContextPanel, PanelAction } from '../../selectors/context-panel.js';

/** A mounted context panel. */
export interface ContextPanelView {
  readonly el: HTMLElement;
  show(panel: ContextPanel | null): void;
}

/** Creates the context panel view (REF-12.3). */
export function createContextPanelView(onCommand: (action: PanelAction) => void): ContextPanelView {
  const el = h('div', { class: 'context-panel', 'data-testid': 'context-panel-body' });

  const show = (panel: ContextPanel | null): void => {
    if (panel === null) {
      el.replaceChildren();
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const nodes: HTMLElement[] = [
      h('h2', { class: 'context-title', 'data-testid': 'context-title', text: panel.title }),
    ];
    for (const bar of panel.bars) {
      nodes.push(
        h(
          'div',
          { class: 'context-bar', 'data-testid': `context-bar-${bar.label}` },
          h('span', { class: 'context-bar-label', text: bar.label }),
          h(
            'span',
            { class: 'context-bar-track' },
            h('span', {
              class: 'context-bar-fill',
              style: `width:${Math.round(bar.permille / 10)}%`,
            }),
          ),
          h('span', { class: 'context-bar-detail', text: bar.detail }),
        ),
      );
    }
    for (const section of panel.sections) {
      nodes.push(
        h(
          'section',
          { class: 'context-section', 'data-testid': `context-section-${section.title}` },
          h('h3', { class: 'context-section-title', text: section.title }),
          h(
            'dl',
            { class: 'context-rows' },
            ...section.rows.flatMap((row) => [
              h('dt', { text: row.label }),
              h('dd', {
                class: row.attention === true ? 'context-row-attention' : 'context-row',
                text: row.value,
              }),
            ]),
          ),
        ),
      );
    }
    if (panel.actions.length > 0) {
      nodes.push(
        h(
          'div',
          { class: 'context-actions' },
          ...panel.actions.map((action) => {
            const button = h('button', {
              'data-testid': `context-action-${action.id}`,
              text: action.label,
              disabled: action.disabled === true,
            });
            button.addEventListener('click', () => onCommand(action));
            return button;
          }),
        ),
      );
    }
    el.replaceChildren(...nodes);
  };

  return { el, show };
}
