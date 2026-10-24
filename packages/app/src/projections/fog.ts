/**
 * Per-actor fog filtering of domain events (ARCH-8.3, PIC-9.3, TDS-17). An
 * event is visible to an actor when it names that actor as its owner, or when
 * it carries no owner and its location, if any, is known to that actor.
 *
 * Source: ARCH-8.3, PIC-9.3
 */
import { readWorld } from '@aesfw/core';
import type { OwnerHandle, Registry, World } from '@aesfw/core';

/** The fields the fog filter reads from an event (a subset of `DomainEvent`). */
export interface FilterableEvent {
  readonly owner: number | null;
  readonly location: number | null;
}

/**
 * Returns the subset of `events` visible to `actor` (INV-19). Filtering
 * happens at the actor boundary — the host publish path — while the raw
 * `advance` outputs stay unfiltered (design D4).
 *
 * Source: ARCH-8.3, PIC-9.3, TDS-17
 */
export function visibleEvents<E extends FilterableEvent>(
  world: World,
  registry: Registry,
  actor: OwnerHandle,
  events: readonly E[],
  fog = true,
): readonly E[] {
  if (!fog) return events;
  const reader = readWorld(world, registry);
  return events.filter((event) => {
    if (event.owner !== null) return event.owner === actor;
    if (event.location === null) return true;
    return reader.knowledge(actor, event.location as never) !== 'unknown';
  });
}
