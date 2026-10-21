/**
 * Per-tick scratch buffers (TDS-11.2). A fresh scratch is created for each tick
 * and never saved; typed accessors for phase pairs arrive with the phases that
 * use them.
 *
 * Source: TDS-11.2
 */
import type { TickScratch } from './types.js';

/** Creates an empty scratch for one tick. */
export function createTickScratch(): TickScratch {
  return { values: new Map<string, unknown>() };
}
