/**
 * The command palette (REF-13.2, REF-13.4): every command and view by
 * localized name, substring-filtered, keyboard-only. Entries reuse the same
 * payload builders as the views; the palette issues nothing itself.
 *
 * Source: REF-13.2, REF-13.4
 */
import type { CommandResultDto } from '@aesfw/protocol';

import type { I18n } from '../i18n/index.js';

/** One palette entry (REF-13.4). */
export interface PaletteCommand {
  readonly id: string;
  readonly label: string;
  readonly keywords: string;
}

/** The command and view catalogue of the palette (REF-13.4). */
export const PALETTE_COMMANDS: readonly PaletteCommand[] = [
  { id: 'window.statistics', label: 'Statistics', keywords: 'economy balance pyramid' },
  { id: 'window.planning', label: 'Planning', keywords: 'chain supported population' },
  { id: 'window.routes', label: 'Routes', keywords: 'logistics transport order' },
  { id: 'window.exchange', label: 'Exchange', keywords: 'trade price' },
  { id: 'window.log', label: 'Log', keywords: 'events history news' },
  { id: 'window.tables', label: 'Tables', keywords: 'inventory population table' },
  { id: 'mode.build', label: 'Build', keywords: 'place menu' },
  { id: 'mode.demolish', label: 'Demolish', keywords: 'remove deconstruct cancel' },
  { id: 'mode.inspect', label: 'Inspect', keywords: 'select cursor' },
  { id: 'overlay.connectivity', label: 'Overlay: connectivity', keywords: 'network hub' },
  { id: 'overlay.suitability', label: 'Overlay: suitability', keywords: 'terrain property' },
  { id: 'overlay.throughput', label: 'Overlay: throughput', keywords: 'throttle pool' },
  { id: 'overlay.coverage', label: 'Overlay: coverage', keywords: 'service radius' },
  { id: 'control.run', label: 'Run', keywords: 'play resume' },
  { id: 'control.pause', label: 'Pause', keywords: 'stop' },
  { id: 'control.step', label: 'Step one tick', keywords: 'advance' },
  { id: 'save.auto', label: 'Save', keywords: 'persist' },
  { id: 'load.auto', label: 'Load', keywords: 'restore' },
  { id: 'debug.toggle', label: 'Debug overlay', keywords: 'hash checksum' },
];

/**
 * Filters the palette by a case-insensitive substring over the label and the
 * keywords (REF-13.4). An empty query returns every entry.
 *
 * Source: REF-13.4
 */
export function paletteMatches(query: string): readonly PaletteCommand[] {
  const needle = query.trim().toLowerCase();
  if (needle === '') return PALETTE_COMMANDS;
  return PALETTE_COMMANDS.filter(
    (command) => command.label.toLowerCase().includes(needle) || command.keywords.includes(needle),
  );
}

/** The localized label of a palette entry (PIC-7 fallback to the entry label). */
export const paletteLabel = (command: PaletteCommand, i18n: I18n): string => {
  const key = `palette.${command.id}`;
  const text = i18n.t(key);
  return text === key ? command.label : text;
};

/** A rejection notice line for the palette's footer (REF-13.4). */
export const paletteNotice = (result: CommandResultDto): string | null =>
  result.status === 'rejected' ? `${result.errors.map((error) => error.code).join(', ')}` : null;
