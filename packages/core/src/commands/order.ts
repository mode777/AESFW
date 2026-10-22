/**
 * Total order for scheduled commands (TDS-9.3, TDS-16.1). Commands apply in
 * `(scheduled tick, actor handle, submission sequence)` order.
 *
 * Source: TDS-9.3, TDS-16.1
 */
import type { ScheduledCommand } from '../world/types.js';

/** Compares two scheduled commands by `(tick, actor, seq)`. */
export function compareScheduledCommands(a: ScheduledCommand, b: ScheduledCommand): number {
  if (a.tick !== b.tick) return a.tick < b.tick ? -1 : 1;
  if (a.actor !== b.actor) return a.actor < b.actor ? -1 : 1;
  if (a.seq !== b.seq) return a.seq < b.seq ? -1 : 1;
  return 0;
}
