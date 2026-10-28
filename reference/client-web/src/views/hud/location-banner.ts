/**
 * The location banner (REF-11): code, region, ownership, slot types, and
 * suitability of the viewed location. An unknown location renders nothing
 * (PIC-9.3).
 *
 * Source: REF-11, PIC-9.3
 */
import { h } from '../../dom/h.js';
import type { LocationBannerModel } from '../../selectors/hud.js';

/** A mounted location banner. */
export interface LocationBannerView {
  readonly el: HTMLElement;
  show(model: LocationBannerModel | null): void;
}

/** Creates the location banner view (REF-11). */
export function createLocationBannerView(): LocationBannerView {
  const el = h('div', { class: 'hud-banner-inner' });
  return {
    el,
    show(model) {
      if (model === null) {
        el.replaceChildren(
          h('span', { class: 'hud-banner-empty', 'data-testid': 'banner-empty', text: '—' }),
        );
        return;
      }
      el.replaceChildren(
        h('span', {
          class: 'hud-banner-code',
          'data-testid': 'banner-code',
          text: model.code,
        }),
        ...(model.region === null
          ? []
          : [
              h('span', {
                class: 'hud-banner-region',
                'data-testid': 'banner-region',
                text: model.region.split('.').at(-1) ?? model.region,
              }),
            ]),
        h('span', {
          class: model.owned ? 'hud-banner-owned' : 'hud-banner-unowned',
          'data-testid': 'banner-ownership',
          text: model.owned ? 'owned' : 'unowned',
        }),
        ...model.slotTypes.map((slot) =>
          h('span', {
            class: 'hud-banner-slot',
            'data-testid': `banner-slot-${slot}`,
            text: slot.split('.').at(-1) ?? slot,
          }),
        ),
        ...model.suitability.map((entry) =>
          h('span', {
            class: 'hud-banner-suitability',
            'data-testid': `banner-suitability-${entry.property}`,
            text: `${entry.property.split('.').at(-1) ?? entry.property} ${entry.permille}‰`,
          }),
        ),
      );
    },
  };
}
