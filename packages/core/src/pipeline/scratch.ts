/**
 * Per-tick scratch buffers (TDS-11.2). A fresh scratch is created for each tick
 * and never saved; typed accessors for phase pairs arrive with the phases that
 * use them.
 *
 * Source: TDS-11.2
 */
import type { CommandOutcome } from '../commands/types.js';
import type { TickScratch } from './types.js';

/** The scratch key holding phase 01's command outcomes. */
export const COMMAND_OUTCOMES_KEY = 'commandOutcomes';

/** Creates an empty scratch for one tick. */
export function createTickScratch(): TickScratch {
  return { values: new Map<string, unknown>() };
}

/** Reads the command outcomes written by phase 01 (empty before it runs). */
export function readCommandOutcomes(scratch: TickScratch): readonly CommandOutcome[] {
  const value = scratch.values.get(COMMAND_OUTCOMES_KEY);
  return Array.isArray(value) ? (value as readonly CommandOutcome[]) : [];
}

/** Writes phase 01's command outcomes into the scratch. */
export function writeCommandOutcomes(
  scratch: TickScratch,
  outcomes: readonly CommandOutcome[],
): void {
  scratch.values.set(COMMAND_OUTCOMES_KEY, outcomes);
}
