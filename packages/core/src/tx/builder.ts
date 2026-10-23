/**
 * The transaction writer and atomic builder (TDS-12.2, ARCH-6.2). A composite
 * stages operations, simulates and validates all of them against a working
 * copy of the affected state, and applies every effect only when all succeed.
 *
 * Source: TDS-12.1, TDS-12.2, ARCH-6.2, INV-01, INV-02, INV-03, INV-15
 */
import type { Diagnostic } from '../errors/diagnostic.js';
import type { Int } from '../fx/index.js';
import { definitionHandle, reservationId } from '../ids/index.js';
import type { DefinitionHandle, EntityId, OwnerHandle, ReservationId, Tick } from '../ids/index.js';
import { err, ok } from '../result.js';
import type { Result } from '../result.js';
import type { OwnerState, Purpose, Reservation, World } from '../world/types.js';
import { accepts } from './inventory.js';
import { effectiveInventoryCapacity } from '../sim/internal-logistics/storage.js';
import type { Inventory } from './inventory.js';
import type {
  AccountRequest,
  AtomicBuilder,
  DepositRequest,
  ReserveCapacityRequest,
  ReserveRequest,
  Transaction,
  TransactionWriter,
  TransferRequest,
  TxEnvironment,
  TxError,
  WithdrawRequest,
} from './types.js';

const MAX_SAFE = Number.MAX_SAFE_INTEGER;
const MIN_SAFE = Number.MIN_SAFE_INTEGER;

type StagedOp =
  | { readonly op: 'reserve'; readonly request: ReserveRequest }
  | { readonly op: 'reserveCapacity'; readonly request: ReserveCapacityRequest }
  | { readonly op: 'release'; readonly reservation: ReservationId }
  | { readonly op: 'commit'; readonly reservation: ReservationId; readonly quantity: Int }
  | { readonly op: 'deposit'; readonly request: DepositRequest }
  | { readonly op: 'withdraw'; readonly request: WithdrawRequest }
  | { readonly op: 'transfer'; readonly request: TransferRequest }
  | { readonly op: 'account'; readonly request: AccountRequest };

interface TxState {
  readonly world: World;
  readonly allowNegative: (resource: DefinitionHandle) => boolean;
  readonly entries: Map<EntityId, Map<DefinitionHandle, Int>>;
  readonly touchedInventories: Set<EntityId>;
  readonly reservations: Map<ReservationId, Reservation>;
  readonly accounts: Map<OwnerHandle, Map<DefinitionHandle, Int>>;
  readonly touchedOwners: Set<OwnerHandle>;
  readonly created: Reservation[];
  readonly transactions: Transaction[];
  readonly base: number;
  nextReservation: number;
}

const txError = (
  code: string,
  args: Readonly<Record<string, string | number | boolean>> = {},
): Diagnostic => ({
  code,
  severity: 'error',
  package: null,
  file: null,
  path: null,
  definition: null,
  args,
});

const checkedAdd = (a: Int, b: Int): Int | null => {
  const result = BigInt(a) + BigInt(b);
  if (result > BigInt(MAX_SAFE) || result < BigInt(MIN_SAFE)) return null;
  return Number(result);
};

const inventoryOf = (state: TxState, inventory: EntityId): Inventory | undefined =>
  state.world.stores.get<Inventory>('inventory').get(inventory);

const entriesFor = (state: TxState, inventory: EntityId): Map<DefinitionHandle, Int> => {
  const existing = state.entries.get(inventory);
  if (existing !== undefined) return existing;
  const loaded = new Map<DefinitionHandle, Int>();
  const component = inventoryOf(state, inventory);
  if (component !== undefined) {
    for (const entry of component.entries) loaded.set(entry.resource, entry.quantity);
  }
  state.entries.set(inventory, loaded);
  return loaded;
};

const stored = (state: TxState, inventory: EntityId, resource: DefinitionHandle): Int =>
  entriesFor(state, inventory).get(resource) ?? 0;

const storedTotal = (state: TxState, inventory: EntityId): Int => {
  let total = 0;
  for (const quantity of entriesFor(state, inventory).values()) total += quantity;
  return total;
};

const setStored = (
  state: TxState,
  inventory: EntityId,
  resource: DefinitionHandle,
  quantity: Int,
): void => {
  entriesFor(state, inventory).set(resource, quantity);
  state.touchedInventories.add(inventory);
};

const quantityReservedIn = (
  state: TxState,
  inventory: EntityId,
  resource: DefinitionHandle,
): Int => {
  let total = 0;
  for (const reservation of state.reservations.values()) {
    if (
      reservation.capacity === false &&
      reservation.inventory === inventory &&
      reservation.resource === resource
    ) {
      total += reservation.quantity;
    }
  }
  return total;
};

const capacityReservedIn = (
  state: TxState,
  inventory: EntityId,
  resource: DefinitionHandle,
): Int => {
  let total = 0;
  for (const reservation of state.reservations.values()) {
    if (
      reservation.capacity === true &&
      reservation.inventory === inventory &&
      reservation.resource === resource
    ) {
      total += reservation.quantity;
    }
  }
  return total;
};

const capacityReservedTotalIn = (state: TxState, inventory: EntityId): Int => {
  let total = 0;
  for (const reservation of state.reservations.values()) {
    if (reservation.capacity === true && reservation.inventory === inventory) {
      total += reservation.quantity;
    }
  }
  return total;
};

const purposeLocked = (
  world: World,
  inventory: EntityId,
  owner: OwnerHandle,
  resource: DefinitionHandle,
  purpose: Purpose,
): boolean => {
  const state: OwnerState | undefined = world.owners.owners[owner];
  if (state === undefined) return false;
  for (const lock of state.purposeLocks) {
    if (lock.inventory === inventory && lock.resource === resource && lock.purpose === purpose) {
      return true;
    }
  }
  return false;
};

const capacityAllows = (
  state: TxState,
  component: Inventory,
  inventory: EntityId,
  resource: DefinitionHandle,
  additional: Int,
): boolean => {
  const { total, perResource } = effectiveInventoryCapacity(state.world, inventory);
  if (
    total !== null &&
    storedTotal(state, inventory) + capacityReservedTotalIn(state, inventory) + additional > total
  ) {
    return false;
  }
  if (
    perResource !== null &&
    stored(state, inventory, resource) +
      capacityReservedIn(state, inventory, resource) +
      additional >
      perResource
  ) {
    return false;
  }
  return true;
};

const accountsFor = (state: TxState, owner: OwnerHandle): Map<DefinitionHandle, Int> => {
  const existing = state.accounts.get(owner);
  if (existing !== undefined) return existing;
  const loaded = new Map<DefinitionHandle, Int>();
  const component = state.world.owners.owners[owner];
  if (component !== undefined) {
    for (const entry of component.accounts) loaded.set(entry.resource, entry.amount);
  }
  state.accounts.set(owner, loaded);
  state.touchedOwners.add(owner);
  return loaded;
};

const allocate = (
  state: TxState,
  inventory: EntityId,
  resource: DefinitionHandle,
  quantity: Int,
  purpose: Purpose,
  holder: EntityId,
  expiryTick: Tick | null,
  capacity: boolean,
): Reservation => {
  const reservation: Reservation = {
    id: reservationId(state.nextReservation),
    inventory,
    resource,
    quantity,
    purpose,
    holder,
    expiryTick,
    capacity,
  };
  state.nextReservation += 1;
  state.reservations.set(reservation.id, reservation);
  state.created.push(reservation);
  return reservation;
};

const seqOf = (state: TxState, index: number): number =>
  state.base + state.transactions.length + index;

const applyOp = (state: TxState, op: StagedOp): TxError | null => {
  switch (op.op) {
    case 'reserve': {
      const request = op.request;
      if (!Number.isSafeInteger(request.quantity) || request.quantity <= 0) {
        return txError('invalid_quantity', { quantity: request.quantity });
      }
      const component = inventoryOf(state, request.inventory);
      if (component === undefined) {
        return txError('unknown_inventory', { inventory: request.inventory });
      }
      if (
        purposeLocked(
          state.world,
          request.inventory,
          component.owner,
          request.resource,
          request.purpose,
        )
      ) {
        return txError('purpose_locked', {
          inventory: request.inventory,
          resource: request.resource,
          purpose: request.purpose,
        });
      }
      if (
        quantityReservedIn(state, request.inventory, request.resource) + request.quantity >
        stored(state, request.inventory, request.resource)
      ) {
        return txError('insufficient_quantity', {
          inventory: request.inventory,
          resource: request.resource,
          requested: request.quantity,
        });
      }
      const reservation = allocate(
        state,
        request.inventory,
        request.resource,
        request.quantity,
        request.purpose,
        request.holder,
        request.expiryTick ?? null,
        false,
      );
      state.transactions.push({
        kind: 'reserve',
        seq: seqOf(state, 0),
        reservation: reservation.id,
        inventory: request.inventory,
        resource: request.resource,
        quantity: request.quantity,
        purpose: request.purpose,
        holder: request.holder,
      });
      return null;
    }
    case 'reserveCapacity': {
      const request = op.request;
      if (!Number.isSafeInteger(request.quantity) || request.quantity <= 0) {
        return txError('invalid_quantity', { quantity: request.quantity });
      }
      const component = inventoryOf(state, request.inventory);
      if (component === undefined) {
        return txError('unknown_inventory', { inventory: request.inventory });
      }
      if (
        !capacityAllows(state, component, request.inventory, request.resource, request.quantity)
      ) {
        return txError('insufficient_capacity', {
          inventory: request.inventory,
          resource: request.resource,
          requested: request.quantity,
        });
      }
      const reservation = allocate(
        state,
        request.inventory,
        request.resource,
        request.quantity,
        request.purpose ?? 'production_input',
        request.holder,
        request.expiryTick ?? null,
        true,
      );
      state.transactions.push({
        kind: 'reserveCapacity',
        seq: seqOf(state, 0),
        reservation: reservation.id,
        inventory: request.inventory,
        resource: request.resource,
        quantity: request.quantity,
        holder: request.holder,
      });
      return null;
    }
    case 'release': {
      if (!state.reservations.has(op.reservation)) {
        return txError('unknown_reservation', { reservation: op.reservation });
      }
      state.reservations.delete(op.reservation);
      state.transactions.push({
        kind: 'release',
        seq: seqOf(state, 0),
        reservation: op.reservation,
      });
      return null;
    }
    case 'commit': {
      const reservation = state.reservations.get(op.reservation);
      if (reservation === undefined) {
        return txError('unknown_reservation', { reservation: op.reservation });
      }
      if (reservation.capacity) {
        return txError('reservation_mismatch', { reservation: op.reservation });
      }
      if (!Number.isSafeInteger(op.quantity) || op.quantity <= 0) {
        return txError('invalid_quantity', { quantity: op.quantity });
      }
      if (op.quantity > reservation.quantity) {
        return txError('quantity_exceeds_reservation', {
          reservation: op.reservation,
          requested: op.quantity,
          reserved: reservation.quantity,
        });
      }
      if (stored(state, reservation.inventory, reservation.resource) < op.quantity) {
        return txError('insufficient_quantity', {
          inventory: reservation.inventory,
          resource: reservation.resource,
          requested: op.quantity,
        });
      }
      setStored(
        state,
        reservation.inventory,
        reservation.resource,
        stored(state, reservation.inventory, reservation.resource) - op.quantity,
      );
      const remaining = reservation.quantity - op.quantity;
      if (remaining === 0) {
        state.reservations.delete(op.reservation);
      } else {
        state.reservations.set(op.reservation, { ...reservation, quantity: remaining });
      }
      state.transactions.push({
        kind: 'commit',
        seq: seqOf(state, 0),
        reservation: op.reservation,
        quantity: op.quantity,
      });
      return null;
    }
    case 'deposit': {
      const request = op.request;
      if (!Number.isSafeInteger(request.quantity) || request.quantity <= 0) {
        return txError('invalid_quantity', { quantity: request.quantity });
      }
      const component = inventoryOf(state, request.inventory);
      if (component === undefined) {
        return txError('unknown_inventory', { inventory: request.inventory });
      }
      if (!accepts(component, request.resource)) {
        return txError('not_acceptable', {
          inventory: request.inventory,
          resource: request.resource,
        });
      }
      if (
        !capacityAllows(state, component, request.inventory, request.resource, request.quantity)
      ) {
        return txError('insufficient_capacity', {
          inventory: request.inventory,
          resource: request.resource,
          requested: request.quantity,
        });
      }
      setStored(
        state,
        request.inventory,
        request.resource,
        stored(state, request.inventory, request.resource) + request.quantity,
      );
      state.transactions.push({
        kind: 'deposit',
        seq: seqOf(state, 0),
        inventory: request.inventory,
        resource: request.resource,
        quantity: request.quantity,
        source: request.source,
        reason: request.reason ?? 'unspecified',
      });
      return null;
    }
    case 'withdraw': {
      const request = op.request;
      if (!Number.isSafeInteger(request.quantity) || request.quantity <= 0) {
        return txError('invalid_quantity', { quantity: request.quantity });
      }
      const component = inventoryOf(state, request.inventory);
      if (component === undefined) {
        return txError('unknown_inventory', { inventory: request.inventory });
      }
      if (
        purposeLocked(
          state.world,
          request.inventory,
          component.owner,
          request.resource,
          request.purpose,
        )
      ) {
        return txError('purpose_locked', {
          inventory: request.inventory,
          resource: request.resource,
          purpose: request.purpose,
        });
      }
      const available =
        stored(state, request.inventory, request.resource) -
        quantityReservedIn(state, request.inventory, request.resource);
      if (request.quantity > available) {
        return txError('insufficient_quantity', {
          inventory: request.inventory,
          resource: request.resource,
          requested: request.quantity,
        });
      }
      setStored(
        state,
        request.inventory,
        request.resource,
        stored(state, request.inventory, request.resource) - request.quantity,
      );
      state.transactions.push({
        kind: 'withdraw',
        seq: seqOf(state, 0),
        inventory: request.inventory,
        resource: request.resource,
        quantity: request.quantity,
        purpose: request.purpose,
        sink: request.sink,
        reason: request.reason ?? 'unspecified',
      });
      return null;
    }
    case 'transfer': {
      const request = op.request;
      if (!Number.isSafeInteger(request.quantity) || request.quantity <= 0) {
        return txError('invalid_quantity', { quantity: request.quantity });
      }
      const from = inventoryOf(state, request.from);
      if (from === undefined) {
        return txError('unknown_inventory', { inventory: request.from });
      }
      if (purposeLocked(state.world, request.from, from.owner, request.resource, request.purpose)) {
        return txError('purpose_locked', {
          inventory: request.from,
          resource: request.resource,
          purpose: request.purpose,
        });
      }
      const to = inventoryOf(state, request.to);
      if (to === undefined) {
        return txError('unknown_inventory', { inventory: request.to });
      }
      if (!accepts(to, request.resource)) {
        return txError('not_acceptable', { inventory: request.to, resource: request.resource });
      }
      const available =
        stored(state, request.from, request.resource) -
        quantityReservedIn(state, request.from, request.resource);
      if (request.quantity > available) {
        return txError('insufficient_quantity', {
          inventory: request.from,
          resource: request.resource,
          requested: request.quantity,
        });
      }
      if (!capacityAllows(state, to, request.to, request.resource, request.quantity)) {
        return txError('insufficient_capacity', {
          inventory: request.to,
          resource: request.resource,
          requested: request.quantity,
        });
      }
      setStored(
        state,
        request.from,
        request.resource,
        stored(state, request.from, request.resource) - request.quantity,
      );
      setStored(
        state,
        request.to,
        request.resource,
        stored(state, request.to, request.resource) + request.quantity,
      );
      state.transactions.push({
        kind: 'transfer',
        seq: seqOf(state, 0),
        from: request.from,
        to: request.to,
        resource: request.resource,
        quantity: request.quantity,
        purpose: request.purpose,
      });
      return null;
    }
    case 'account': {
      const request = op.request;
      const owner = state.world.owners.owners[request.owner];
      if (owner === undefined) {
        return txError('unknown_owner', { owner: request.owner });
      }
      const current = accountsFor(state, request.owner).get(request.resource) ?? 0;
      const next = checkedAdd(current, request.delta);
      if (next === null) {
        return txError('arithmetic_overflow', { owner: request.owner, resource: request.resource });
      }
      if (next < 0 && !state.allowNegative(request.resource)) {
        return txError('insufficient_balance', {
          owner: request.owner,
          resource: request.resource,
          balance: current,
          delta: request.delta,
        });
      }
      accountsFor(state, request.owner).set(request.resource, next);
      state.transactions.push({
        kind: 'account',
        seq: seqOf(state, 0),
        owner: request.owner,
        resource: request.resource,
        delta: request.delta,
        reason: request.reason ?? 'unspecified',
      });
      return null;
    }
  }
};

const commit = (state: TxState): void => {
  const store = state.world.stores.get<Inventory>('inventory');
  for (const inventory of [...state.touchedInventories].sort((a, b) => a - b)) {
    const component = inventoryOf(state, inventory);
    if (component === undefined) continue;
    const entries = [
      ...(state.entries.get(inventory) ?? new Map<DefinitionHandle, Int>()).entries(),
    ]
      .filter(([, quantity]) => quantity !== 0)
      .sort((a, b) => a[0] - b[0])
      .map(([resource, quantity]) => ({ resource: definitionHandle(resource), quantity }));
    store.set(inventory, { ...component, entries, revision: component.revision + 1 });
  }
  for (const owner of [...state.touchedOwners].sort((a, b) => a - b)) {
    const component = state.world.owners.owners[owner];
    if (component === undefined) continue;
    const accounts = [...(state.accounts.get(owner) ?? new Map<DefinitionHandle, Int>()).entries()]
      .filter(([, amount]) => amount !== 0)
      .sort((a, b) => a[0] - b[0])
      .map(([resource, amount]) => ({ resource: definitionHandle(resource), amount }));
    const updated: OwnerState = { ...component, accounts };
    state.world.owners = {
      owners: state.world.owners.owners.map((entry, index) => (index === owner ? updated : entry)),
    };
  }
  state.world.ledger = {
    reservations: [...state.reservations.values()].sort((a, b) => a.id - b.id),
  };
  state.world.nextReservationId = reservationId(state.nextReservation);
};

/**
 * Creates a transaction writer bound to `world` (TDS-12). `journal` receives
 * applied transactions when non-null; the environment decides balance
 * negativity (GDD-7.5).
 *
 * Source: TDS-12, ARCH-6
 */
export function createTransactionWriter(
  world: World,
  journal: Transaction[] | null,
  environment: TxEnvironment = {},
): TransactionWriter {
  const allowNegative = environment.allowNegative ?? ((): boolean => false);

  const run = (staged: readonly StagedOp[]): Result<readonly Reservation[], TxError> => {
    const state: TxState = {
      world,
      allowNegative,
      entries: new Map(),
      touchedInventories: new Set(),
      reservations: new Map(
        world.ledger.reservations.map((reservation) => [reservation.id, reservation]),
      ),
      accounts: new Map(),
      touchedOwners: new Set(),
      created: [],
      transactions: [],
      base: journal?.length ?? 0,
      nextReservation: world.nextReservationId,
    };
    for (const op of staged) {
      const failure = applyOp(state, op);
      if (failure !== null) return err(failure);
    }
    commit(state);
    if (journal !== null) {
      for (const transaction of state.transactions) journal.push(transaction);
    }
    return ok(state.created);
  };

  const collect = (build: (builder: AtomicBuilder) => void): StagedOp[] => {
    const staged: StagedOp[] = [];
    const builder: AtomicBuilder = {
      reserve: (request) => staged.push({ op: 'reserve', request }),
      reserveCapacity: (request) => staged.push({ op: 'reserveCapacity', request }),
      release: (reservation) => staged.push({ op: 'release', reservation }),
      commit: (reservation, quantity) => staged.push({ op: 'commit', reservation, quantity }),
      deposit: (request) => staged.push({ op: 'deposit', request }),
      withdraw: (request) => staged.push({ op: 'withdraw', request }),
      transfer: (request) => staged.push({ op: 'transfer', request }),
      account: (request) => staged.push({ op: 'account', request }),
    };
    build(builder);
    return staged;
  };

  return {
    atomic(build) {
      const result = run(collect(build));
      return result.ok ? ok(undefined) : err(result.error);
    },
    reserve(request) {
      const result = run([{ op: 'reserve', request }]);
      if (!result.ok) return err(result.error);
      const reservation = result.value[0];
      return reservation === undefined ? err(txError('unknown_reservation', {})) : ok(reservation);
    },
    reserveCapacity(request) {
      const result = run([{ op: 'reserveCapacity', request }]);
      if (!result.ok) return err(result.error);
      const reservation = result.value[0];
      return reservation === undefined ? err(txError('unknown_reservation', {})) : ok(reservation);
    },
    release(reservation) {
      const result = run([{ op: 'release', reservation }]);
      return result.ok ? ok(undefined) : err(result.error);
    },
  };
}
