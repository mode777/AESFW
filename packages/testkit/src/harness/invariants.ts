/**
 * The `checkInvariants` framework (VER-6). It evaluates INV-01 to INV-05, INV-07, and INV-08,
 * INV-10, INV-12, INV-14, INV-18, INV-20, INV-21, and INV-24; INV-17 is checked by the clone-run
 * harness. Each later system row extends the catalogue without changing the
 * runner.
 *
 * Source: VER-6, INV-01, INV-02, INV-03, INV-04, INV-05, INV-07, INV-08, INV-10, INV-12, INV-14, INV-18, INV-20, INV-21, INV-22, INV-24
 */
import {
  InvariantViolation,
  buildConnectivityCache,
  buildSpatialCache,
  decodeWorld,
  det,
  encodeWorld,
  effectiveInventoryCapacity,
  exchangeConfigOfEntity,
  hashWorld,
  ids,
  priceSideBounds,
  resourceAllowsNegative,
  world as core,
} from '@aesfw/core';
import type { Inventory, Registry, TickOutput } from '@aesfw/core';
import type { CapabilityConsumer, CapabilityProvider } from '@aesfw/core';
import type { Location } from '@aesfw/core';
import { cargoSlotsValid } from '@aesfw/core';
import type { Cargo } from '@aesfw/core';
import type {
  Producer,
  ResourceSource,
  SourceSlotBinding,
  ThroughputAllocation,
  ThroughputPool,
  WorkingAreaClaim,
} from '@aesfw/core';
import type { PopulationGroup } from '@aesfw/core';

type World = core.World;

/** The knowledge-level order `unknown < discovered < established` (INV-14). */
const KNOWLEDGE_ORDER: Readonly<Record<string, number>> = {
  unknown: 0,
  discovered: 1,
  established: 2,
};

/**
 * INV-13: no sequence of trades within one tick and one exchange yields a
 * profit from buying and reselling the same resource (GDD-17.3, GDD-17.4).
 * With per-direction monotone prices and a validated base spread this holds
 * exactly when every price row keeps `sell < buy`.
 */
const checkExchangeSpread = (world: World, findings: InvariantFinding[]): void => {
  for (const price of world.exchanges.prices) {
    if (price.sell < price.buy) continue;
    findings.push({
      id: 'INV-13',
      message:
        `exchange ${price.exchange} resource ${price.resource}` +
        ` has sell ${price.sell} not below buy ${price.buy}`,
    });
  }
};

/**
 * INV-12: every exchange price stays within
 * `[min_price_permille, max_price_permille] × base_price` of its good
 * (GDD-17.3).
 */
const checkExchangePrices = (
  world: World,
  registry: Registry,
  findings: InvariantFinding[],
): void => {
  const report = (message: string): void => {
    findings.push({ id: 'INV-12', message });
  };
  for (const price of world.exchanges.prices) {
    const config = exchangeConfigOfEntity(registry, world, price.exchange);
    if (config === null) {
      report(`exchange ${price.exchange} has no readable definition for price state`);
      continue;
    }
    for (const direction of ['buy', 'sell'] as const) {
      let side: { base: number; min: number; max: number };
      try {
        side = priceSideBounds(config, price.resource, direction);
      } catch {
        report(`exchange ${price.exchange} has no good for resource ${price.resource}`);
        continue;
      }
      const value = direction === 'buy' ? price.buy : price.sell;
      if (value < side.min || value > side.max) {
        report(
          `exchange ${price.exchange} ${direction} price ${value} for resource ${price.resource}` +
            ` is outside [${side.min}, ${side.max}]`,
        );
      }
    }
  }
};

/** INV-14: per owner and location, knowledge never decreases and stays sorted. */
const checkKnowledge = (before: World, world: World, findings: InvariantFinding[]): void => {
  const report = (message: string): void => {
    findings.push({ id: 'INV-14', message });
  };
  for (let owner = 0; owner < world.owners.owners.length; owner += 1) {
    const state = world.owners.owners[owner];
    if (state === undefined) continue;
    let previous: number | null = null;
    for (const entry of state.knowledge) {
      if (previous !== null && entry.location <= previous) {
        report(
          `owner ${owner} knowledge entries are not strictly ascending at location ${entry.location}`,
        );
      }
      previous = entry.location;
    }
    const beforeState = before.owners.owners[owner];
    if (beforeState === undefined) continue;
    for (const entry of state.knowledge) {
      const prior = beforeState.knowledge.find(
        (candidate) => candidate.location === entry.location,
      );
      if (prior === undefined) continue;
      const currentLevel = KNOWLEDGE_ORDER[entry.level];
      const priorLevel = KNOWLEDGE_ORDER[prior.level];
      if (currentLevel === undefined || priorLevel === undefined) continue;
      if (currentLevel < priorLevel) {
        report(
          `owner ${owner} knowledge of location ${entry.location} decreased from ${prior.level} to ${entry.level}`,
        );
      }
    }
  }
};

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

const checkSpatialCache = (world: World, findings: InvariantFinding[]): void => {
  if (world.caches.spatial === undefined || world.caches.dirty) return;
  const rebuilt = buildSpatialCache(world);
  if (det.canonicalStringify(rebuilt) !== det.canonicalStringify(world.caches.spatial)) {
    findings.push({
      id: 'INV-20',
      message: 'a full spatial-cache rebuild differs from the maintained cache',
    });
  }
};

const checkConnectivityCache = (world: World, findings: InvariantFinding[]): void => {
  if (world.caches.connectivity === undefined || world.caches.dirty) return;
  const rebuilt = buildConnectivityCache(world);
  if (det.canonicalStringify(rebuilt) !== det.canonicalStringify(world.caches.connectivity)) {
    findings.push({
      id: 'INV-20',
      message: 'a full connectivity-cache rebuild differs from the maintained cache',
    });
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

const checkOwnerAccounts = (
  world: World,
  registry: Registry,
  findings: InvariantFinding[],
): void => {
  for (const owner of world.owners.owners) {
    for (const entry of owner.accounts) {
      if (entry.amount < 0 && !resourceAllowsNegative(registry, entry.resource)) {
        findings.push({
          id: 'INV-01',
          message: `owner ${owner.handle} resource ${entry.resource} account is negative (${entry.amount}) without allow_negative`,
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
    const { total, perResource } = effectiveInventoryCapacity(world, id);
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

/**
 * INV-05: no capability allocation exceeds the pool it was made from.
 *
 * The provider rates are published in phase 26, after phase 23 has changed the
 * population, so at the end of a decline tick the current rates are *below* the
 * pool the allocation used. The tick therefore publishes the phase-05 pools as
 * `metrics.capability_supply`; when present it is authoritative for this check,
 * and the end-of-tick provider rates are the fallback for hand-built outputs.
 */
const checkCapabilityAllocation = (
  world: World,
  findings: InvariantFinding[],
  metrics?: Readonly<Record<string, unknown>>,
): void => {
  const published = metrics?.['capability_supply'];
  const supply = new Map<string, number>();
  if (published !== null && typeof published === 'object' && !Array.isArray(published)) {
    for (const [key, value] of Object.entries(published)) {
      if (typeof value === 'number') supply.set(key, value);
    }
  } else {
    const providerStore = world.stores.get<CapabilityProvider>('capabilityProvider');
    for (const id of providerStore.ids()) {
      const provider = providerStore.get(id) as CapabilityProvider | null | undefined;
      if (provider == null) continue;
      const key = `${provider.scope}:${provider.location ?? 0}:${provider.capability}`;
      supply.set(key, (supply.get(key) ?? 0) + provider.rate);
    }
  }
  const consumerStore = world.stores.get<CapabilityConsumer>('capabilityConsumer');
  const allocationStore = world.stores.get('capabilityAllocation');
  const grantedByKey = new Map<string, number>();
  for (const id of allocationStore.ids()) {
    const allocation = allocationStore.get(id) as { readonly granted?: number } | null | undefined;
    const consumer = consumerStore.get(id) as CapabilityConsumer | null | undefined;
    if (allocation == null || consumer == null) continue;
    if (consumer.substitutes.length > 0) continue;
    const key = `${consumer.scope}:${consumer.location ?? 0}:${consumer.capability}`;
    grantedByKey.set(key, (grantedByKey.get(key) ?? 0) + (allocation.granted ?? 0));
  }
  for (const [key, granted] of grantedByKey) {
    if (granted > (supply.get(key) ?? 0)) {
      findings.push({
        id: 'INV-05',
        message: `capability pool ${key} grants ${granted} above supply ${supply.get(key) ?? 0}`,
      });
    }
  }
};

const checkPopulationBounds = (world: World, findings: InvariantFinding[]): void => {
  const store = world.stores.get<PopulationGroup>('populationGroup');
  for (const id of store.ids()) {
    const group = store.get(id) as PopulationGroup | null | undefined;
    if (group == null) continue;
    if (typeof group.count !== 'number' || typeof group.capacity !== 'number') continue;
    if (group.count < 0 || group.count > group.capacity) {
      findings.push({
        id: 'INV-07',
        message: `population group ${id} count ${group.count} is outside [0, ${group.capacity}]`,
      });
    }
  }
};

const checkSatisfactionRange = (world: World, findings: InvariantFinding[]): void => {
  const store = world.stores.get('satisfaction');
  for (const id of store.ids()) {
    const value = store.get(id) as
      | { readonly z?: number; readonly categories?: readonly { readonly fulfillment?: number }[] }
      | null
      | undefined;
    if (value == null) continue;
    const outOfRange = (amount: number | undefined): boolean =>
      typeof amount === 'number' && (amount < 0 || amount > 1000);
    if (outOfRange(value.z)) {
      findings.push({ id: 'INV-08', message: `satisfaction ${id} z is out of range` });
    }
    for (const category of value.categories ?? []) {
      if (outOfRange(category.fulfillment)) {
        findings.push({ id: 'INV-08', message: `satisfaction ${id} category is out of range` });
      }
    }
  }
};

const checkBandCoverage = (
  world: World,
  registry: Registry,
  findings: InvariantFinding[],
): void => {
  const residenceStore = world.stores.get('residence');
  const satisfactionStore = world.stores.get('satisfaction');
  const bandStore = world.stores.get('bandState');
  for (const id of residenceStore.ids()) {
    const residence = residenceStore.get(id) as
      { readonly bands?: number; readonly needs?: readonly unknown[] } | null | undefined;
    if (residence == null) continue;
    const z = (satisfactionStore.get(id) as { readonly z?: number } | undefined)?.z;
    const state = bandStore.get(id) as
      { readonly band?: number; readonly bandIndex?: number } | undefined;
    if (residence.bands !== undefined && z !== undefined) {
      if (state === undefined) {
        findings.push({ id: 'INV-09', message: `residence ${id} has no satisfaction band state` });
        continue;
      }
      const table = bandTableFor(registry, residence.bands);
      if (table === null) continue;
      const index = bandIndexFor(table, z);
      if (index === null || index !== state.bandIndex) {
        findings.push({
          id: 'INV-09',
          message: `residence ${id} band ${String(state.bandIndex)} does not contain z ${z}`,
        });
      }
    }
  }
};

const bandTableFor = (
  registry: Registry,
  handle: number,
): { readonly bands: readonly { readonly min: number }[] } | null => {
  const data = registry.definitionDataOf?.('band', handle as never);
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record = data as { readonly [key: string]: unknown };
  const bands = Array.isArray(record['bands']) ? record['bands'] : [];
  const parsed = bands
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return null;
      const min = (entry as { readonly [key: string]: unknown })['min'];
      return typeof min === 'number' ? { min } : null;
    })
    .filter((entry): entry is { readonly min: number } => entry !== null);
  return parsed.length > 0 ? { bands: parsed.map((entry) => ({ min: entry.min })) } : null;
};

const bandIndexFor = (
  table: { readonly bands: readonly { readonly min: number }[] },
  z: number,
): number | null => {
  let selected: number | null = null;
  for (let index = 0; index < table.bands.length; index += 1) {
    const band = table.bands[index];
    if (band !== undefined && z >= band.min) selected = index;
  }
  return selected;
};

const checkProducerConsistency = (world: World, findings: InvariantFinding[]): void => {
  const store = world.stores.get<Producer>('producer');
  for (const id of store.ids()) {
    const producer = store.get(id) as Producer | null | undefined;
    if (producer == null) continue;
    if (producer.state !== 'processing') continue;
    const invalid = producer.blockReasons.filter((reason) => reason !== 'throughput_throttled');
    if (invalid.length > 0) {
      findings.push({
        id: 'INV-22',
        message: `producer ${id} is processing with block reasons ${invalid.join(',')}`,
      });
    }
  }
};

const checkSourceConsistency = (world: World, findings: InvariantFinding[]): void => {
  const sourceStore = world.stores.get<ResourceSource>('resourceSource');
  const bindingStore = world.stores.get<SourceSlotBinding>('sourceSlotBinding');
  const claimStore = world.stores.get<WorkingAreaClaim>('workingArea');
  for (const id of sourceStore.ids()) {
    const source = sourceStore.get(id) as ResourceSource | null | undefined;
    if (source == null) continue;
    if ((source.blockReasons?.length ?? 0) > 0 && (bindingStore.has(id) || claimStore.has(id))) {
      findings.push({
        id: 'INV-22',
        message: `blocked source ${id} holds a slot binding or working-area claim`,
      });
    }
  }
  for (const id of bindingStore.ids()) {
    const binding = bindingStore.get(id) as SourceSlotBinding | null | undefined;
    if (binding == null) continue;
    const location = world.stores.get<Location>('location').get(binding.location);
    const slot = location?.sourceSlots?.find((entry) => entry.type === binding.slotType);
    if (slot === undefined || slot.count <= 0) {
      findings.push({
        id: 'INV-22',
        message: `source ${id} holds a slot binding to a missing slot`,
      });
    }
  }
};

const checkCargoSlots = (world: World, findings: InvariantFinding[]): void => {
  const store = world.stores.get<Cargo>('cargo');
  for (const id of store.ids()) {
    const cargo = store.get(id) as Cargo | null | undefined;
    if (cargo == null) continue;
    if (!cargoSlotsValid(cargo)) {
      findings.push({
        id: 'INV-16',
        message: `transport ${id} has an invalid typed cargo slot`,
      });
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

const checkOwnerBalanceConservation = (
  before: World,
  output: TickOutput,
  findings: InvariantFinding[],
): void => {
  const journal = output.journal;
  if (journal === null) return;
  const delta = new Map<string, number>();
  const add = (owner: number, resource: number, amount: number): void => {
    const key = `${owner}:${resource}`;
    delta.set(key, (delta.get(key) ?? 0) + amount);
  };
  for (const transaction of journal) {
    if (transaction.kind === 'account') {
      add(transaction.owner, transaction.resource, transaction.delta);
    } else if (transaction.kind === 'trade') {
      const total = transaction.price * transaction.quantity;
      add(
        transaction.owner,
        transaction.currency,
        transaction.direction === 'buy' ? -total : total,
      );
    }
  }
  const beforeTotals = new Map<string, number>();
  for (const owner of before.owners.owners) {
    for (const entry of owner.accounts)
      beforeTotals.set(`${owner.handle}:${entry.resource}`, entry.amount);
  }
  const afterTotals = new Map<string, number>();
  for (const owner of output.world.owners.owners) {
    for (const entry of owner.accounts)
      afterTotals.set(`${owner.handle}:${entry.resource}`, entry.amount);
  }
  const keys = new Set<string>([...beforeTotals.keys(), ...afterTotals.keys(), ...delta.keys()]);
  for (const key of keys) {
    const expected = (afterTotals.get(key) ?? 0) - (beforeTotals.get(key) ?? 0);
    const actual = delta.get(key) ?? 0;
    if (expected !== actual) {
      findings.push({
        id: 'INV-23',
        message: `owner balance ${key} changed by ${expected} but the journal accounts for ${actual}`,
      });
    }
  }
};

const checkThroughputAllocation = (world: World, findings: InvariantFinding[]): void => {
  const poolStore = world.stores.get<ThroughputPool>('throughputPool');
  const allocationStore = world.stores.get<ThroughputAllocation>('throughputAllocation');
  const byLocation = new Map<number, ThroughputAllocation[]>();
  for (const id of allocationStore.ids()) {
    const allocation = allocationStore.get(id) as ThroughputAllocation | null | undefined;
    if (allocation == null) continue;
    const list = byLocation.get(allocation.location);
    if (list === undefined) byLocation.set(allocation.location, [allocation]);
    else list.push(allocation);
  }
  for (const location of poolStore.ids()) {
    const pool = poolStore.get(location) as ThroughputPool | null | undefined;
    if (pool == null) continue;
    const allocations = byLocation.get(location) ?? [];
    let requested = 0;
    let granted = 0;
    for (const allocation of allocations) {
      requested += allocation.requested;
      granted += allocation.granted;
    }
    if (granted > pool.capacity) {
      findings.push({
        id: 'INV-06',
        message: `location ${location} grants ${granted} above capacity ${pool.capacity}`,
      });
    }
    for (const allocation of allocations) {
      if (allocation.granted > allocation.requested) {
        findings.push({
          id: 'INV-06',
          message: `entity at location ${location} is granted ${allocation.granted} above request ${allocation.requested}`,
        });
        continue;
      }
      if (requested <= pool.capacity) {
        if (allocation.granted !== allocation.requested) {
          findings.push({
            id: 'INV-06',
            message: `entity at location ${location} is under-granted ${allocation.granted} of ${allocation.requested}`,
          });
        }
        continue;
      }
      if (allocation.requested === 0) continue;
      const product = BigInt(pool.capacity) * BigInt(allocation.requested);
      const denominator = BigInt(requested);
      const lower = Number(product / denominator);
      const upper = Number((product + denominator - 1n) / denominator);
      if (allocation.granted < lower || allocation.granted > upper) {
        findings.push({
          id: 'INV-06',
          message: `entity at location ${location} is granted ${allocation.granted}, outside [${lower}, ${upper}]`,
        });
      }
    }
  }
};

/**
 * Evaluates the invariant catalogue over a completed tick (VER-6).
 *
 * Source: VER-6, INV-01, INV-02, INV-03, INV-04, INV-05, INV-07, INV-08, INV-10, INV-18, INV-20, INV-21, INV-22, INV-24
 */
export function checkInvariants(
  before: World,
  output: TickOutput,
  registry: Registry,
): readonly InvariantFinding[] {
  const findings: InvariantFinding[] = [];
  checkInventoryNonNegative(output.world, findings);
  checkOwnerAccounts(output.world, registry, findings);
  checkReservationsWithinStored(output.world, findings);
  checkCapacity(output.world, findings);
  checkCapabilityAllocation(output.world, findings, output.metrics);
  checkThroughputAllocation(output.world, findings);
  checkProducerConsistency(output.world, findings);
  checkSourceConsistency(output.world, findings);
  checkCargoSlots(output.world, findings);
  checkPopulationBounds(output.world, findings);
  checkSatisfactionRange(output.world, findings);
  checkBandCoverage(output.world, registry, findings);
  checkConservation(before, output, findings);
  checkOwnerBalanceConservation(before, output, findings);
  checkKnowledge(before, output.world, findings);
  checkExchangePrices(output.world, registry, findings);
  checkExchangeSpread(output.world, findings);
  checkEntityIds(output.world, findings);
  checkAscending(output.world, findings);
  checkPersistence(output.world, registry, findings);
  checkSpatialCache(output.world, findings);
  checkConnectivityCache(output.world, findings);
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
