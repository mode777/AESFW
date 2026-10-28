/**
 * The command palette overlay (REF-13.2, REF-13.4): a keyboard-only list with a
 * substring filter. Enter runs the highlighted entry, Escape closes, Arrow keys
 * move the highlight.
 *
 * Source: REF-13.2, REF-13.4
 */
import { h } from '../../dom/h.js';
import type { PaletteCommand } from '../../selectors/palette.js';

/** A mounted palette. */
export interface CommandPalette {
  readonly el: HTMLElement;
  open(commands: readonly PaletteCommand[]): void;
  close(): void;
  visible(): boolean;
  /** The highlighted entry id, for tests. */
  highlight(): string | null;
}

/** Creates the palette overlay (REF-13.4). */
export function createCommandPalette(onRun: (command: PaletteCommand) => void): CommandPalette {
  const input = h('input', {
    class: 'palette-input',
    'data-testid': 'palette-input',
    type: 'search',
    placeholder: 'Command or view',
    'aria-label': 'Command palette',
  });
  const list = h('ul', { class: 'palette-list', 'data-testid': 'palette-list' });
  const el = h(
    'div',
    { class: 'palette', 'data-testid': 'command-palette', hidden: true },
    input,
    list,
  );
  let commands: readonly PaletteCommand[] = [];
  let index = 0;

  const render = (): void => {
    list.replaceChildren(
      ...commands.map((command, position) =>
        h('li', {
          class: position === index ? 'palette-entry palette-entry-active' : 'palette-entry',
          'data-testid': `palette-entry-${command.id}`,
          'aria-selected': position === index ? 'true' : 'false',
          text: command.label,
          onclick: () => run(position),
        }),
      ),
    );
  };

  const run = (position: number): void => {
    const command = commands[position];
    if (command === undefined) return;
    onRun(command);
    close();
  };

  const close = (): void => {
    el.hidden = true;
    (input as HTMLInputElement).value = '';
  };

  const filter = (query: string): void => {
    const needle = query.trim().toLowerCase();
    commands =
      needle === ''
        ? commands
        : commands.filter(
            (command) =>
              command.label.toLowerCase().includes(needle) || command.keywords.includes(needle),
          );
    index = 0;
    render();
  };

  const inputValue = (): string => (input as HTMLInputElement).value;
  input.addEventListener('input', () => filter(inputValue()));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      index = Math.min(commands.length - 1, index + 1);
      render();
      event.preventDefault();
    } else if (event.key === 'ArrowUp') {
      index = Math.max(0, index - 1);
      render();
      event.preventDefault();
    } else if (event.key === 'Enter') {
      run(index);
      event.preventDefault();
    } else if (event.key === 'Escape') {
      close();
      event.preventDefault();
    }
  });

  return {
    el,
    open(all) {
      commands = all;
      index = 0;
      el.hidden = false;
      render();
      input.focus();
    },
    close,
    visible: () => !el.hidden,
    highlight: () => commands[index]?.id ?? null,
  };
}
