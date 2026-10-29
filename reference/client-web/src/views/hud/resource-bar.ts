/**
 * The resource bar (REF-11): the owner balance with its net rate, then the
 * viewed location's stock chips. It renders only data the protocol exposes
 * (PIC-10.6, PIC-10.2); it makes no affordability judgment (amendment A14).
 *
 * Source: REF-11, PIC-10.2, PIC-10.6
 */
import { h } from '../../dom/h.js';
import type { Formatter } from '../../format/index.js';
import type { ResourceBarModel } from '../../selectors/hud.js';

/** A mounted resource bar. */
export interface ResourceBarView {
  readonly el: HTMLElement;
  show(model: ResourceBarModel): void;
}

/** Creates the resource bar view (REF-11). */
export function createResourceBarView(
  formatter: Formatter,
  onPin: (resourceId: string) => void = () => undefined,
): ResourceBarView {
  const balance = h('span', {
    class: 'hud-balance',
    'data-testid': 'resource-bar-balance',
    text: formatter.format(0),
  });
  const net = h('span', {
    class: 'hud-net',
    'data-testid': 'resource-bar-net',
    text: `${formatter.formatRate(0)}`,
  });
  const chips = h('ul', { class: 'hud-chips' });
  const el = h(
    'div',
    { class: 'hud-resource-bar-inner' },
    h('span', { class: 'hud-resource-bar-label', text: 'credits' }),
    balance,
    net,
    chips,
  );

  let signature = '';
  const show = (model: ResourceBarModel): void => {
    const next = `${model.balance}|${model.netRate}|${model.chips
      .map((chip) => `${chip.resourceId}:${chip.value}:${chip.pinned}`)
      .join(',')}`;
    if (next === signature) return;
    signature = next;
    balance.textContent = model.balance;
    net.textContent = model.netRate;
    chips.replaceChildren(
      ...model.chips.map((chip) => {
        const button = h(
          'button',
          {
            class: chip.pinned ? 'hud-chip hud-chip-pinned' : 'hud-chip',
            'data-testid': `resource-chip-${chip.resourceId}`,
            title: chip.resourceId,
            'aria-pressed': chip.pinned ? 'true' : 'false',
            text: '',
          },
          h('span', { class: 'hud-chip-label', text: chip.label }),
          h('span', { class: 'hud-chip-value', text: chip.value }),
        );
        button.addEventListener('click', () => onPin(chip.resourceId));
        return button;
      }),
    );
  };

  return { el, show };
}
