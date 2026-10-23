/**
 * Deterministic route planning and movement (ARCH-14.1–14.3, GDD-15.2). Paths
 * minimize traversal ticks and, for equal cost, compare connection-ID
 * sequences lexicographically so the same graph always yields the same path.
 *
 * Source: ARCH-14.1, ARCH-14.2, ARCH-14.3, GDD-15.2
 */
import { mulDiv } from '../../fx/index.js';
import type { Int } from '../../fx/index.js';
import type { EntityId, StringId } from '../../ids/index.js';
import type { EventWriter } from '../../events/event-writer.js';
import type { TickScratch } from '../../pipeline/types.js';
import type { World } from '../../world/types.js';
import { locationOf } from '../location.js';
import type { LocationConnection } from '../location.js';
import { TRANSPORT_ARRIVALS_KEY } from './types.js';
import type { TransportArrival, TransportMovement } from './types.js';

/** A planned path between two locations. */
export type RoutePath = {
  readonly locations: readonly EntityId[];
  readonly connections: readonly StringId[];
  readonly totalTicks: Int;
};

/** The traversal time of one connection at `speedPermille` (ARCH-14.1). */
export function traversalTicks(baseDurationTicks: Int, speedPermille: Int): Int {
  if (speedPermille <= 0) return baseDurationTicks;
  return mulDiv(baseDurationTicks, 1000, speedPermille, 'ceil');
}

const connectionUsable = (
  connection: LocationConnection,
  allowedTags: readonly StringId[],
): boolean => {
  if (!connection.enabled) return false;
  if (connection.allowedTransportTags.length === 0) return true;
  if (allowedTags.length === 0) return true;
  return connection.allowedTransportTags.some((tag) => allowedTags.includes(tag));
};

const nextLocation = (connection: LocationConnection, current: EntityId): EntityId | null => {
  if (connection.origin === current) return connection.destination;
  if (connection.direction === 'bidirectional' && connection.destination === current) {
    return connection.origin;
  }
  return null;
};

const compareConnectionSequences = (
  left: readonly StringId[],
  right: readonly StringId[],
): number => {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined || b === undefined) continue;
    if (a < b) return -1;
    if (a > b) return 1;
  }
  return left.length - right.length;
};

type Candidate = {
  readonly location: EntityId;
  readonly cost: Int;
  readonly locations: readonly EntityId[];
  readonly connections: readonly StringId[];
};

const better = (candidate: Candidate, best: Candidate | undefined): boolean => {
  if (best === undefined) return true;
  if (candidate.cost !== best.cost) return candidate.cost < best.cost;
  return compareConnectionSequences(candidate.connections, best.connections) < 0;
};

/**
 * Plans the shortest stable path from `from` to `to` (ARCH-14.3).
 *
 * Source: ARCH-14.3, GDD-15.2
 */
export function planRoute(
  world: World,
  from: EntityId,
  to: EntityId,
  speedPermille: Int,
  allowedTags: readonly StringId[] = [],
): RoutePath | null {
  if (from === to) return { locations: [from], connections: [], totalTicks: 0 };
  const best = new Map<EntityId, Candidate>();
  const queue: Candidate[] = [{ location: from, cost: 0, locations: [from], connections: [] }];
  best.set(from, queue[0] as Candidate);
  while (queue.length > 0) {
    let index = 0;
    for (let candidateIndex = 1; candidateIndex < queue.length; candidateIndex += 1) {
      const candidate = queue[candidateIndex];
      const selected = queue[index];
      if (candidate === undefined || selected === undefined) continue;
      if (better(candidate, selected)) index = candidateIndex;
    }
    const current = queue.splice(index, 1)[0];
    if (current === undefined) break;
    const known = best.get(current.location);
    if (known !== undefined && known !== current && !better(current, known)) continue;
    best.set(current.location, current);
    if (current.location === to) continue;
    const location = locationOf(world, current.location);
    if (location === undefined) continue;
    for (const connection of location.connections ?? []) {
      if (!connectionUsable(connection, allowedTags)) continue;
      const next = nextLocation(connection, current.location);
      if (next === null) continue;
      const candidate: Candidate = {
        location: next,
        cost: current.cost + traversalTicks(connection.baseDurationTicks, speedPermille),
        locations: [...current.locations, next],
        connections: [...current.connections, connection.id],
      };
      if (better(candidate, best.get(next))) queue.push(candidate);
    }
  }
  const result = best.get(to);
  if (result === undefined) return null;
  return {
    locations: result.locations,
    connections: result.connections,
    totalTicks: result.cost,
  };
}

/** Starts a unit along `path`, replacing any previous movement. */
export function startMovement(world: World, entity: EntityId, path: RoutePath): boolean {
  const store = world.stores.get<TransportMovement>('movement');
  const movement = store.get(entity);
  if (movement === undefined || path.locations.length === 0) return false;
  store.set(entity, {
    ...movement,
    location: path.locations[0] as EntityId,
    path: path.locations,
    connectionIds: path.connections,
    step: 0,
    progress: 0,
  });
  return true;
}

/**
 * Advances one unit by one tick and returns its arrival, if any. Movement is
 * the same for physical and abstract units; only presentation differs.
 *
 * Source: ARCH-14.1, ARCH-14.2
 */
export function advanceMovement(world: World, entity: EntityId): TransportArrival | null {
  const store = world.stores.get<TransportMovement>('movement');
  const movement = store.get(entity);
  if (movement === undefined || movement.path === undefined || movement.path.length === 0) {
    return null;
  }
  const step = movement.step ?? 0;
  const current = movement.path[step];
  const next = movement.path[step + 1];
  if (current === undefined || next === undefined) return null;
  const connectionId = movement.connectionIds?.[step];
  const connection =
    connectionId === undefined
      ? undefined
      : locationOf(world, current)?.connections?.find((entry) => entry.id === connectionId);
  if (connection === undefined) return null;
  const duration = traversalTicks(connection.baseDurationTicks, movement.speedPermille);
  const progress = (movement.progress ?? 0) + 1;
  if (progress < duration) {
    store.set(entity, { ...movement, progress });
    return null;
  }
  store.set(entity, { ...movement, location: next, step: step + 1, progress: 0 });
  return { unit: entity, location: next };
}

/** Runs phase 16 over movement components in ascending entity ID. */
export function advanceTransport(world: World, scratch: TickScratch, events: EventWriter): void {
  const store = world.stores.get<TransportMovement>('movement');
  const arrivals: TransportArrival[] = [];
  for (const entity of store.ids()) {
    const arrival = advanceMovement(world, entity);
    if (arrival === null) continue;
    arrivals.push(arrival);
    events.emit({
      type: 'TransportArrived',
      subjects: [entity],
      owner: null,
      location: arrival.location,
      payload: { unit: entity, location: arrival.location },
    });
  }
  scratch.values.set(TRANSPORT_ARRIVALS_KEY, arrivals);
}

/** Reads phase 16's arrivals (empty before it runs). */
export function readTransportArrivals(scratch: TickScratch): readonly TransportArrival[] {
  const value = scratch.values.get(TRANSPORT_ARRIVALS_KEY);
  return Array.isArray(value) ? (value as readonly TransportArrival[]) : [];
}
