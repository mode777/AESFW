/**
 * Placeholder slots of the HUD (REF-11). The minimap is filled by 11.4b and the
 * news rail by 11.4f; until then they render a quiet, labelled placeholder so
 * the layout is complete and every region is addressable.
 *
 * Source: REF-11
 */
import { h } from '../../dom/h.js';

/** Mounts the minimap placeholder into its slot. */
export function mountMinimapPlaceholder(slot: HTMLElement): void {
  slot.replaceChildren(
    h('p', { class: 'hud-placeholder', 'data-testid': 'minimap-placeholder', text: '—' }),
  );
}

/** Mounts the collapsed news rail into its slot. */
export function mountNewsPlaceholder(slot: HTMLElement): void {
  slot.replaceChildren(
    h('p', { class: 'hud-placeholder', 'data-testid': 'news-placeholder', text: '—' }),
  );
}
