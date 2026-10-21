/**
 * The `checkInvariants` framework (VER-6). It evaluates INV-01 to INV-04,
 * INV-10, INV-18, INV-21, and INV-24; INV-17 is checked by the clone-run
 * harness. Each later system row extends the catalogue without changing the
 * runner.
 *
 * Source: VER-6, INV-01, INV-02, INV-03, INV-04, INV-10, INV-18, INV-21, INV-24
 */
import {
  InvariantViolation,
  decodeWorld,
  encodeWorld,
  hashWorld,
  ids,
  world as core,
} from '@aesfw/core';
import type { Inventory, Registry, TickOutput } from '@aesfw/core';

type World = core.World;

/** A violated invariant, returned as data (VER-6). */
export interface InvariantFinding {
  readonly id: string;
  readonly message: string;
}

const checkEntityIds = (world: World, findings: InvariantFinding[]): void => {
  for (const kind of world.stores.kinds) {
    const store = world.stores.get(kind);
    for (const id of store.ids()) {
      if (id >= world.nextEntityId) {
        findings.push({
          id: 'INV-10',
          message: `${kind} entity ${id} is not below nextEntityId ${world.nextEntityId}`,
        });
      }
    }
  }
};

const checkAscending = (world: World, findings: InvariantFinding[]): void => {
  for (const kind of world.stores.kinds) {
    const ids = world.stores.get(kind).ids();
    for (let index = 1; index < ids.length; index += 1) {
      if ((ids[index] ?? 0) <= (ids[index - 1] ?? 0)) {
        findings.push({ id: 'INV-24', message: `${kind} ids are not in ascending order` });
      }
    }
  }
};

const checkPersistence = (world: World, registry: Registry, findings: InvariantFinding[]): void => {
  const decoded = decodeWorld(registry, encodeWorld(world, registry));
  if (!decoded.ok) {
    findings.push({ id: 'INV-18', message: 'encode/decode round-trip failed' });
    return;
  }
  if (hashWorld(decoded.value, registry) !== hashWorld(world, registry)) {
    findings.push({ id: 'INV-18', message: 'round-trip state hash mismatch' });
  }
};

const inventoryStore = (world: World) => world.stores.get<Inventory>('inventory');

const storedTotals = (world: World): Map<number, number> => {
  const totals = new Map<number, number>();
  const store = inventoryStore(world);
  for (const id of store.ids()) {
    const inventory = store.get(id) as Inventory | null | undefined;
    if (inventory == null) continue;
    for (const entry of inventory.entries) {
      totals.set(entry.resource, (totals.get(entry.resource) ?? 0) + entry.quantity);
    }
  }
  return totals;
};

const checkInventoryNonNegative = (world: World, findings: InvariantFinding[]): void => {
  const store = inventoryStore(world);
  for (const id of store.ids()) {
    const inventory = store.get(id) as Inventory | null | undefined;
    if (inventory == null) continue;
    for (const entry of inventory.entries) {
      if (entry.quantity < 0) {
        findings.push({
          id: 'INV-01',
          message: `inventory ${id} resource ${entry.resource} is negative (${entry.quantity})`,
        });
      }
    }
  }
};

const checkReservationsWithinStored = (world: World, findings: InvariantFinding[]): void => {
  const reserved = new Map<string, number>();
  for (const reservation of world.ledger.reservations) {
    if (reservation.capacity) continue;
    const key = `${reservation.inventory}:${reservation.resource}`;
    reserved.set(key, (reserved.get(key) ?? 0) + reservation.quantity);
  }
  const store = inventoryStore(world);
  for (const [key, amount] of reserved) {
    const parts = key.split(':');
    const inventoryId = Number(parts[0]);
    const resource = Number(parts[1]);
    const component = store.get(ids.entityId(inventoryId));
    const stored = component?.entries.find((entry) => entry.resource === resource)?.quantity ?? 0;
    if (amount > stored) {
      findings.push({
        id: 'INV-02',
        message: `inventory ${inventoryId} resource ${resource} reserves ${amount} above stored ${stored}`,
      });
    }
  }
};

const checkCapacity = (world: World, findings: InvariantFinding[]): void => {
  const store = inventoryStore(world);
  for (const id of store.ids()) {
    const inventory = store.get(id) as Inventory | null | undefined;
    if (inventory == null) continue;
    const { total, perResource } = inventory.capacity;
    let storedTotal = 0;
    for (const entry of inventory.entries) storedTotal += entry.quantity;
    let capacityTotal = 0;
    const capacityPerResource = new Map<number, number>();
    for (const reservation of world.ledger.reservations) {
      if (!reservation.capacity || reservation.inventory !== id) continue;
      capacityTotal += reservation.quantity;
      capacityPerResource.set(
        reservation.resource,
        (capacityPerResource.get(reservation.resource) ?? 0) + reservation.quantity,
      );
    }
    if (total !== null && storedTotal + capacityTotal > total) {
      findings.push({
        id: 'INV-03',
        message: `inventory ${id} stores ${storedTotal} plus capacity ${capacityTotal} above total ${total}`,
      });
    }
    if (perResource !== null) {
      for (const entry of inventory.entries) {
        const reserved = capacityPerResource.get(entry.resource) ?? 0;
        if (entry.quantity + reserved > perResource) {
          findings.push({
            id: 'INV-03',
            message: `inventory ${id} resource ${entry.resource} stores ${entry.quantity} plus capacity ${reserved} above per-resource ${perResource}`,
          });
        }
      }
    }
  }
};

const checkConservation = (
  before: World,
  output: TickOutput,
  findings: InvariantFinding[],
): void => {
  const journal = output.journal;
  if (journal === null) return;
  const resourceOf = new Map<number, number>();
  for (const reservation of before.ledger.reservations) {
    resourceOf.set(reservation.id, reservation.resource);
  }
  for (const transaction of journal) {
    if (transaction.kind === 'reserve' || transaction.kind === 'reserveCapacity') {
      resourceOf.set(transaction.reservation, transaction.resource);
    }
  }
  const delta = new Map<number, number>();
  const add = (resource: number, amount: number): void => {
    delta.set(resource, (delta.get(resource) ?? 0) + amount);
  };
  for (const transaction of journal) {
    if (transaction.kind === 'deposit') add(transaction.resource, transaction.quantity);
    else if (transaction.kind === 'withdraw') add(transaction.resource, -transaction.quantity);
    else if (transaction.kind === 'commit') {
      const resource = resourceOf.get(transaction.reservation);
      if (resource !== undefined) add(resource, -transaction.quantity);
    }
  }
  const beforeTotals = storedTotals(before);
  const afterTotals = storedTotals(output.world);
  const resources = new Set<number>([
    ...beforeTotals.keys(),
    ...afterTotals.keys(),
    ...delta.keys(),
  ]);
  for (const resource of resources) {
    const expected = (afterTotals.get(resource) ?? 0) - (beforeTotals.get(resource) ?? 0);
    const actual = delta.get(resource) ?? 0;
    if (expected !== actual) {
      findings.push({
        id: 'INV-04',
        message: `resource ${resource} changed by ${expected} but the journal accounts for ${actual}`,
      });
    }
  }
};

/**
 * Evaluates the invariant catalogue over a completed tick (VER-6).
 *
 * Source: VER-6, INV-01, INV-02, INV-03, INV-04, INV-10, INV-18, INV-21, INV-24
 */
export function checkInvariants(
  before: World,
  output: TickOutput,
  registry: Registry,
): readonly InvariantFinding[] {
  const findings: InvariantFinding[] = [];
  checkInventoryNonNegative(output.world, findings);
  checkReservationsWithinStored(output.world, findings);
  checkCapacity(output.world, findings);
  checkConservation(before, output, findings);
  checkEntityIds(output.world, findings);
  checkAscending(output.world, findings);
  checkPersistence(output.world, registry, findings);
  if (output.tick !== before.tick + 1) {
    findings.push({
      id: 'INV-21',
      message: `output tick ${output.tick} is not before.tick + 1 (${before.tick + 1})`,
    });
  }
  return findings;
}

/**
 * Throws `InvariantViolation` when any invariant is violated (VER-6).
 *
 * Source: VER-6
 */
export function expectInvariants(before: World, output: TickOutput, registry: Registry): void {
  const findings = checkInvariants(before, output, registry);
  const first = findings[0];
  if (first !== undefined) {
    throw new InvariantViolation('invariant_violation', { id: first.id, message: first.message });
  }
}
