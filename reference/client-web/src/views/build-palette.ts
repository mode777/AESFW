/**
 * The build palette (REF-13.3, REF-12.4). Lists the placeable entity
 * definitions from the palette view model and reports the selection. It
 * computes no mechanics and issues no commands itself.
 *
 * Source: REF-13.3, REF-12.4
 */
import { h, replaceChildren } from '../dom/h.js';
import type { PaletteEntry } from '../selectors/index.js';

/** A mounted build palette. */
export interface BuildPalette {
  readonly el: HTMLElement;
  show(entries: readonly PaletteEntry[], selectedId: string | null): void;
}

/**
 * Creates the build palette (REF-13.3).
 *
 * Source: REF-13.3, REF-12.4
 */
export function createBuildPalette(onSelect: (definitionId: string) => void): BuildPalette {
  const list = h('div', { class: 'build-palette', 'data-testid': 'build-palette' });

  const show = (entries: readonly PaletteEntry[], selectedId: string | null): void => {
    replaceChildren(
      list,
      ...entries.map((entry) =>
        h('button', {
          class: entry.definitionId === selectedId ? 'palette-item selected' : 'palette-item',
          'data-testid': `palette-item-${entry.definitionId}`,
          'data-archetype': entry.archetype,
          'aria-pressed': entry.definitionId === selectedId,
          text: entry.label,
          onclick: () => onSelect(entry.definitionId),
        }),
      ),
    );
  };

  show([], null);
  return { el: list, show };
}
